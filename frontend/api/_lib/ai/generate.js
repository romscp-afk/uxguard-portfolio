import {
  ASSISTANT_TYPES,
  MAX_INPUT_CHARS,
  creditCostForAction,
  getOpenAiModel,
} from "./config.js";
import { caseStudySystemPrompt } from "./prompts/case-study.js";
import { researchSystemPrompt } from "./prompts/research.js";
import { documentationSystemPrompt } from "./prompts/documentation.js";
import { portfolioReviewSystemPrompt } from "./prompts/portfolio-review.js";
import { buildUserPayload } from "./prompts/shared.js";
import { runResponses, isAiConfigured } from "./openai-client.js";
import { assertRateLimit } from "./rate-limit.js";
import {
  appendMessage,
  consumeCredits,
  createConversation,
  getConversationForUser,
  getOrCreateCredits,
  updateConversation,
} from "./persistence.js";
import { assertAiCredits } from "../billing/entitlements.js";
import { setAiCreditsUsed } from "../billing/persistence.js";

const INJECTION_PATTERNS = [
  /ignore (all|any|previous|prior) instructions/i,
  /reveal (your|the) (system|hidden) prompt/i,
  /jailbreak/i,
];

function selectSystemPrompt(assistantType, action) {
  switch (assistantType) {
    case "case-study":
      return caseStudySystemPrompt(action);
    case "research":
      return researchSystemPrompt(action);
    case "documentation":
      return documentationSystemPrompt(action);
    case "portfolio-review":
      return portfolioReviewSystemPrompt(action);
    default: {
      const error = new Error("Unknown assistant type.");
      error.status = 400;
      throw error;
    }
  }
}

function sanitizeInputs(inputs) {
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    return {};
  }
  const cleaned = {};
  let total = 0;
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === "string") {
      const trimmed = value.slice(0, 8000);
      total += trimmed.length;
      cleaned[key] = trimmed;
    } else if (typeof value === "number" || typeof value === "boolean") {
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.slice(0, 50).map((item) => String(item).slice(0, 500));
      total += JSON.stringify(cleaned[key]).length;
    } else if (value && typeof value === "object") {
      cleaned[key] = JSON.stringify(value).slice(0, 4000);
      total += cleaned[key].length;
    }
    if (total > MAX_INPUT_CHARS) {
      const error = new Error("Input is too long. Please shorten your content and try again.");
      error.status = 400;
      error.code = "input_too_long";
      throw error;
    }
  }
  return cleaned;
}

function detectInjection(inputs) {
  const blob = JSON.stringify(inputs).toLowerCase();
  return INJECTION_PATTERNS.some((re) => re.test(blob));
}

function titleFromInputs(assistantType, inputs, action) {
  if (inputs.project_title) return String(inputs.project_title).slice(0, 80);
  if (inputs.product_name) return String(inputs.product_name).slice(0, 80);
  if (inputs.research_objective) return String(inputs.research_objective).slice(0, 80);
  const labels = {
    "case-study": "Case study",
    research: "Research",
    documentation: "Documentation",
    "portfolio-review": "Portfolio review",
  };
  return `${labels[assistantType] || "AI"} · ${action}`;
}

/**
 * Full generate pipeline: auth assumed done by route.
 */
export async function generateAiResponse({ user, body }) {
  if (!isAiConfigured()) {
    const error = new Error("AI is not configured. Ask an admin to set OPENAI_API_KEY.");
    error.status = 503;
    error.code = "ai_not_configured";
    throw error;
  }

  const assistantType = body.assistantType;
  const action = body.action;
  if (!ASSISTANT_TYPES.has(assistantType)) {
    const error = new Error("Invalid assistant type.");
    error.status = 400;
    error.code = "invalid_assistant";
    throw error;
  }
  if (!action || typeof action !== "string") {
    const error = new Error("Action is required.");
    error.status = 400;
    throw error;
  }

  const creditsNeeded = creditCostForAction(action);
  assertRateLimit(user.id);

  const inputs = sanitizeInputs(body.inputs);
  if (detectInjection(inputs)) {
    const error = new Error("That request could not be processed. Please rephrase your inputs.");
    error.status = 400;
    error.code = "unsafe_input";
    throw error;
  }

  await assertAiCredits(user.id, creditsNeeded);

  let conversationId = body.conversationId || null;
  let conversation = null;
  if (conversationId) {
    const found = await getConversationForUser(conversationId, user.id);
    if (!found) {
      const error = new Error("Conversation not found.");
      error.status = 404;
      throw error;
    }
    conversation = found.conversation;
  } else {
    conversation = await createConversation(user.id, {
      title: titleFromInputs(assistantType, inputs, action),
      assistant_type: assistantType,
    });
    conversationId = conversation.id;
  }

  const priorContent = body.priorContent || null;
  const tone = typeof body.tone === "string" ? body.tone.slice(0, 40) : "professional";
  const length = typeof body.length === "string" ? body.length.slice(0, 40) : "detailed";

  const systemPrompt = selectSystemPrompt(assistantType, action);
  const userPayload = buildUserPayload({ action, inputs, tone, length, priorContent });

  await appendMessage({
    conversationId,
    role: "user",
    content: { action, inputs, tone, length, priorContent: Boolean(priorContent) },
    credits_used: 0,
  });

  const modelResult = await runResponses({ systemPrompt, userPayload });

  const charged = await consumeCredits(user.id, creditsNeeded, {
    feature: `${assistantType}.${action}`,
    model: modelResult.model || getOpenAiModel(),
    input_tokens: modelResult.input_tokens,
    output_tokens: modelResult.output_tokens,
  });

  const after = await getOrCreateCredits(user.id);
  await setAiCreditsUsed(user.id, after.used_credits);

  const assistantMessage = await appendMessage({
    conversationId,
    role: "assistant",
    content: modelResult.content,
    input_tokens: modelResult.input_tokens,
    output_tokens: modelResult.output_tokens,
    credits_used: creditsNeeded,
    version_of: body.versionOf || null,
  });

  await updateConversation(conversationId, user.id, {
    title: conversation.title || titleFromInputs(assistantType, inputs, action),
  });

  return {
    success: true,
    conversationId,
    messageId: assistantMessage.id,
    content: modelResult.content,
    creditsUsed: charged.creditsUsed,
    remainingCredits: charged.remainingCredits,
    model: modelResult.model,
    upgrade_required: false,
  };
}

export async function getCreditsSummary(userId) {
  const credits = await getOrCreateCredits(userId);
  return {
    monthly_allowance: credits.monthly_allowance,
    purchased_credits: credits.purchased_credits,
    used_credits: credits.used_credits,
    remaining_credits: remainingCredits(credits),
    reset_date: credits.reset_date,
    model: isAiConfigured() ? getOpenAiModel() : null,
    enabled: isAiConfigured(),
  };
}
