const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
const AI_API_BASE = (process.env.AI_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

const CONTEXT_GUIDES = {
  general: `You help UX researchers and designers build portfolios on UXGuard. Guide them on structure, storytelling, evidence-driven case studies, and professional presentation.`,
  case_study: `You help write and refine UX case studies. Use clear narrative structure: context, challenge, research methods, findings, impact, and reflections. Prefer specific, measurable outcomes. Suggest research methods when relevant.`,
  project: `You help describe UX/design projects for a portfolio. Focus on role, scope, team, timeline, and measurable outcomes.`,
  profile: `You help craft professional bios and profile copy for UX researchers and designers. Keep tone confident, specific, and concise.`,
  portfolio: `You help users organize and present their portfolio — section ordering, featured work, and how to position their expertise.`,
};

const FIELD_SCHEMAS = {
  case_study: {
    title: "string",
    subtitle: "string",
    client: "string",
    project_type: "string",
    role: "string",
    duration: "string",
    summary: "string — 2-3 sentence overview",
    challenge: "string — problem statement",
    methodology: "string — research approach",
    impact: "string — outcomes and metrics",
    reflections: "string — lessons learned",
    methods: "string[] or comma-separated research methods",
    metrics: "array of { label, value, description? }",
    content_blocks: "array of { type: text|quote|findings, data: object }",
  },
  project: {
    title: "string",
    description: "string",
    client: "string",
    role: "string",
    status: "planning|active|completed|archived",
    tags: "string[] or comma-separated",
    team: "string[] or comma-separated",
    outcomes: "array of { label, value, description? }",
  },
  profile: {
    name: "string",
    title: "string — professional headline",
    bio: "string — 2-4 sentences",
    location: "string",
  },
};

function isAssistantEnabled() {
  return Boolean(OPENAI_API_KEY?.trim());
}

function buildSystemPrompt({ context, field, draft, user }) {
  const guide = CONTEXT_GUIDES[context] || CONTEXT_GUIDES.general;
  const schema = FIELD_SCHEMAS[context];
  const userLine = user
    ? `The user is ${user.name}${user.title ? ` (${user.title})` : ""}.`
    : "";

  let prompt = `You are UXGuard AI, an expert portfolio and case study writing assistant for UX researchers and designers.
${guide}
${userLine}

Respond ONLY with valid JSON in this shape:
{
  "message": "your conversational reply in markdown",
  "field_updates": { "field_name": "value" } or null,
  "suggestions": ["follow-up prompt 1", "follow-up prompt 2"] or []
}

Rules:
- "message" is required and should be helpful, specific, and actionable.
- Include "field_updates" only when the user asks you to write, draft, improve, or generate content for specific fields.
- field_updates must only use fields relevant to the current context.
- Never invent fake metrics or client names unless the user provides them or asks for placeholders clearly marked as examples.
- Keep field_updates concise and publication-ready.
- suggestions: 0-3 short follow-up prompts the user might click.
- Do not wrap JSON in markdown code fences.`;

  if (schema) {
    prompt += `\n\nAllowed field_updates for context "${context}":\n${JSON.stringify(schema, null, 2)}`;
  }

  if (field) {
    prompt += `\n\nThe user is focused on the "${field}" field. Prioritize help for that field.`;
  }

  if (draft && Object.keys(draft).length > 0) {
    const trimmed = JSON.stringify(draft, null, 2);
    const maxLen = 12000;
    prompt += `\n\nCurrent draft the user is editing:\n${trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed}`;
  }

  return prompt;
}

function parseAssistantJson(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return { message: "I could not generate a response. Please try again.", field_updates: null, suggestions: [] };
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
    return { message: text, field_updates: null, suggestions: [] };
  }
}

function sanitizeFieldUpdates(context, fieldUpdates) {
  if (!fieldUpdates || typeof fieldUpdates !== "object") return null;

  const allowed = new Set(Object.keys(FIELD_SCHEMAS[context] || {}));
  if (allowed.size === 0) return null;

  const cleaned = {};
  for (const [key, value] of Object.entries(fieldUpdates)) {
    if (allowed.has(key) && value !== undefined && value !== null && value !== "") {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export async function chatWithAssistant({ messages, context = "general", field, draft, user }) {
  if (!isAssistantEnabled()) {
    const error = new Error(
      "AI assistant is not configured. Set OPENAI_API_KEY in your Vercel project environment variables.",
    );
    error.status = 503;
    throw error;
  }

  const systemPrompt = buildSystemPrompt({ context, field, draft, user });
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
    })),
  ];

  const res = await fetch(`${AI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const error = new Error(`AI provider error (${res.status}): ${body.slice(0, 200) || res.statusText}`);
    error.status = res.status === 429 ? 429 : 502;
    throw error;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  const parsed = parseAssistantJson(content);

  return {
    message: String(parsed.message || "Here is a suggestion for your portfolio."),
    field_updates: sanitizeFieldUpdates(context, parsed.field_updates),
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s) => typeof s === "string").slice(0, 3)
      : [],
    model: AI_MODEL,
  };
}

export function getAssistantStatus() {
  return {
    enabled: isAssistantEnabled(),
    provider: isAssistantEnabled() ? "openai" : null,
    model: isAssistantEnabled() ? AI_MODEL : null,
  };
}
