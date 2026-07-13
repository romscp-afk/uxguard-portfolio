import OpenAI from "openai";
import { getOpenAiApiKey, getOpenAiModel } from "./config.js";

export function isAiConfigured() {
  return Boolean(getOpenAiApiKey());
}

export function createOpenAiClient() {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    const error = new Error("AI is not configured. Set OPENAI_API_KEY on the server.");
    error.status = 503;
    error.code = "ai_not_configured";
    throw error;
  }
  return new OpenAI({ apiKey });
}

function extractOutputText(response) {
  if (response?.output_text) return response.output_text;
  const chunks = [];
  for (const item of response?.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      if (part.type === "output_text" && part.text) chunks.push(part.text);
      if (part.type === "text" && part.text) chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function parseJsonContent(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return {
      markdown: "No content was generated. Please try again.",
      assumptions_and_gaps: ["Empty model response"],
    };
  }
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        /* fall through */
      }
    }
    return { markdown: text, assumptions_and_gaps: [] };
  }
}

function providerMessage(err) {
  return String(
    err?.error?.message ||
      err?.message ||
      err?.error?.code ||
      "",
  );
}

function providerCode(err) {
  return String(err?.error?.code || err?.code || "").toLowerCase();
}

function mapProviderError(err) {
  const status = err?.status || err?.statusCode;
  const code = providerCode(err);
  const message = providerMessage(err).toLowerCase();

  if (status === 401 || status === 403 || code.includes("invalid_api_key")) {
    const error = new Error(
      "OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel and redeploy.",
    );
    error.status = 502;
    error.code = "provider_auth";
    throw error;
  }

  if (
    code === "insufficient_quota" ||
    message.includes("insufficient_quota") ||
    message.includes("exceeded your current quota") ||
    message.includes("billing")
  ) {
    const error = new Error(
      "OpenAI quota is exhausted for this key. Add billing credit in the OpenAI dashboard, or wait for free-tier reset. This is not a UXGuard credit issue.",
    );
    error.status = 402;
    error.code = "provider_quota";
    throw error;
  }

  if (status === 429 || code.includes("rate_limit")) {
    const error = new Error(
      "OpenAI rate limit hit (common on free/trial keys). Wait about a minute and try a shorter request, or upgrade the OpenAI plan.",
    );
    error.status = 429;
    error.code = "provider_rate_limit";
    throw error;
  }

  if (
    status === 404 ||
    code === "model_not_found" ||
    message.includes("model") && message.includes("does not exist") ||
    message.includes("not have access to model")
  ) {
    const model = getOpenAiModel();
    const error = new Error(
      `Model "${model}" is not available on this OpenAI account. Set OPENAI_MODEL to a model your key can use (for example gpt-4o-mini or gpt-3.5-turbo) and redeploy.`,
    );
    error.status = 502;
    error.code = "provider_model";
    throw error;
  }

  // Keep message useful but avoid leaking stack/secrets
  const safeHint = providerMessage(err).slice(0, 180);
  const error = new Error(
    safeHint
      ? `AI generation failed: ${safeHint}`
      : "AI generation failed. Please try again.",
  );
  error.status = 502;
  error.code = "provider_error";
  throw error;
}

async function runChatCompletions(client, model, systemPrompt, userPayload) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 2500,
  });

  return {
    raw: completion.choices?.[0]?.message?.content || "",
    usage: completion.usage || {},
  };
}

async function runResponsesApi(client, model, systemPrompt, userPayload) {
  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ],
    text: {
      format: { type: "json_object" },
    },
    temperature: 0.6,
    max_output_tokens: 2500,
  });

  return {
    raw: extractOutputText(response),
    usage: response.usage || {},
  };
}

/**
 * Prefer Chat Completions for free/trial compatibility.
 * Set AI_USE_RESPONSES=true to try Responses API first.
 */
export async function runResponses({ systemPrompt, userPayload }) {
  const client = createOpenAiClient();
  const model = getOpenAiModel();
  const preferResponses = String(process.env.AI_USE_RESPONSES || "").toLowerCase() === "true";

  try {
    let raw = "";
    let usage = {};

    if (preferResponses) {
      try {
        const result = await runResponsesApi(client, model, systemPrompt, userPayload);
        raw = result.raw;
        usage = result.usage;
      } catch (responsesErr) {
        // Only fall back when Responses itself is unsupported — avoid burning free-tier quota twice on 429/quota.
        const status = responsesErr?.status || responsesErr?.statusCode;
        const code = providerCode(responsesErr);
        const shouldFallback =
          status === 404 ||
          status === 400 ||
          code.includes("not_found") ||
          /responses/i.test(providerMessage(responsesErr));
        if (!shouldFallback) {
          mapProviderError(responsesErr);
        }
        const result = await runChatCompletions(client, model, systemPrompt, userPayload);
        raw = result.raw;
        usage = result.usage;
      }
    } else {
      const result = await runChatCompletions(client, model, systemPrompt, userPayload);
      raw = result.raw;
      usage = result.usage;
    }

    const content = parseJsonContent(raw);

    return {
      content,
      model,
      input_tokens: usage.input_tokens || usage.prompt_tokens || 0,
      output_tokens: usage.output_tokens || usage.completion_tokens || 0,
      raw,
    };
  } catch (err) {
    if (err?.code && err?.status && String(err.message || "").startsWith("OpenAI")) {
      throw err;
    }
    if (err?.code && ["provider_auth", "provider_quota", "provider_rate_limit", "provider_model", "provider_error"].includes(err.code)) {
      throw err;
    }
    mapProviderError(err);
  }
}
