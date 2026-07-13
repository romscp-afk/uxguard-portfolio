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

/**
 * Call OpenAI Responses API with JSON output.
 * Falls back to Chat Completions if Responses is unavailable.
 */
export async function runResponses({ systemPrompt, userPayload }) {
  const client = createOpenAiClient();
  const model = getOpenAiModel();

  try {
    let raw = "";
    let usage = {};

    try {
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
        max_output_tokens: 4000,
      });
      raw = extractOutputText(response);
      usage = response.usage || {};
    } catch (responsesErr) {
      // Fallback for accounts/SDKs without Responses API support
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPayload },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 4000,
      });
      raw = completion.choices?.[0]?.message?.content || "";
      usage = completion.usage || {};
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
    const status = err?.status || err?.statusCode;
    if (status === 429) {
      const error = new Error("The AI service is busy. Please try again shortly.");
      error.status = 429;
      error.code = "provider_rate_limit";
      throw error;
    }
    if (status === 401 || status === 403) {
      const error = new Error("AI provider authentication failed. Check OPENAI_API_KEY.");
      error.status = 502;
      error.code = "provider_auth";
      throw error;
    }
    const error = new Error("AI generation failed. Please try again.");
    error.status = 502;
    error.code = "provider_error";
    throw error;
  }
}
