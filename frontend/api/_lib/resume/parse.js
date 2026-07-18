import { consumeCredits } from "../ai/persistence.js";
import { isAiConfigured, runResponses } from "../ai/openai-client.js";
import { getOpenAiModel } from "../ai/config.js";
import { mergeParsedIntoResume, normalizeResume } from "./schema.js";
import {
  buildExtractionPayload,
  heuristicStructureFromText,
} from "./extraction.js";

export const RESUME_IMPORT_CREDITS = 3;

const SYSTEM_PROMPT = `You extract structured resume data from plain text.
Return ONLY a JSON object with this exact shape:
{
  "basics": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "summary": "",
    "linkedin_url": "",
    "website_url": "",
    "github_url": "",
    "links": [{ "label": "", "url": "" }]
  },
  "experience": [{
    "company": "",
    "role": "",
    "location": "",
    "start": "",
    "end": "",
    "current": false,
    "bullets": [""]
  }],
  "education": [{
    "school": "",
    "degree": "",
    "field": "",
    "start": "",
    "end": "",
    "details": ""
  }],
  "skills": [""],
  "certifications": [{ "name": "", "issuer": "", "year": "" }],
  "projects": [{ "name": "", "url": "", "summary": "" }],
  "languages": [{ "language": "", "proficiency": "" }]
}
Rules:
- Use empty strings/arrays when unknown.
- Prefer concise bullet points from the source.
- Do not invent employers, degrees, dates, metrics, or proficiency levels that are not clearly stated.
- If uncertain about a value, leave it empty rather than guessing.
- Dates may be free-form (e.g. "Jan 2022", "2020").
- current=true only when the role is ongoing.`;

export async function structureResumeWithAi({ userId, resumeText, existingResume }) {
  const warnings = [];

  if (!isAiConfigured()) {
    const heuristic = heuristicStructureFromText(resumeText);
    const merged = mergeParsedIntoResume(existingResume, heuristic);
    const extraction = buildExtractionPayload({
      resume: merged,
      rawText: resumeText,
      warnings,
      parser: "heuristic",
      aiUsed: false,
    });
    return {
      resume: { ...merged, extraction, parse_status: "ready" },
      ai_used: false,
      credits_used: 0,
      message:
        "AI writing assistance is not currently configured. Content was extracted with a basic parser — please review carefully.",
      extraction,
    };
  }

  const charged = await consumeCredits(userId, RESUME_IMPORT_CREDITS, {
    feature: "resume.import",
    model: getOpenAiModel(),
  });

  const { content } = await runResponses({
    systemPrompt: SYSTEM_PROMPT,
    userPayload: JSON.stringify({
      task: "parse_resume",
      resume_text: resumeText,
    }),
  });

  const merged = mergeParsedIntoResume(existingResume, content || {});
  const extraction = buildExtractionPayload({
    resume: merged,
    rawText: resumeText,
    warnings,
    parser: "ai",
    aiUsed: true,
  });

  return {
    resume: { ...merged, extraction, parse_status: "ready" },
    ai_used: true,
    credits_used: charged?.creditsUsed || RESUME_IMPORT_CREDITS,
    message: "Resume details extracted from your upload. Please review before continuing.",
    extraction,
  };
}

export function emptyExtractionResume(userId, existingResume, resumeText, message) {
  const base = normalizeResume(existingResume, userId);
  const extraction = buildExtractionPayload({
    resume: base,
    rawText: resumeText || "",
    warnings: [{ code: "extract_failed", message: message || "Extraction failed" }],
    parser: "none",
    aiUsed: false,
  });
  extraction.status = "failed";
  return {
    resume: { ...base, extraction, parse_status: "failed", parse_error: message },
    extraction,
  };
}
