import { consumeCredits } from "../ai/persistence.js";
import { isAiConfigured, runResponses } from "../ai/openai-client.js";
import { getOpenAiModel } from "../ai/config.js";
import { mergeParsedIntoResume, normalizeResume } from "./schema.js";

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
  "projects": [{ "name": "", "url": "", "summary": "" }]
}
Rules:
- Use empty strings/arrays when unknown.
- Prefer concise bullet points from the source.
- Do not invent employers, degrees, or dates that are not supported by the text.
- Dates may be free-form (e.g. "Jan 2022", "2020").
- current=true only when the role is ongoing.`;

export async function structureResumeWithAi({ userId, resumeText, existingResume }) {
  if (!isAiConfigured()) {
    return {
      resume: normalizeResume(existingResume, userId),
      ai_used: false,
      credits_used: 0,
      message: "AI is not configured. File saved — fill fields manually.",
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
  return {
    resume: merged,
    ai_used: true,
    credits_used: charged?.creditsUsed || RESUME_IMPORT_CREDITS,
    message: "Resume details filled from your upload.",
  };
}
