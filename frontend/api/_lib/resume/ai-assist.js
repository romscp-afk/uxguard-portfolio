import { consumeCredits } from "../ai/persistence.js";
import { isAiConfigured, runResponses } from "../ai/openai-client.js";
import { getOpenAiModel } from "../ai/config.js";
import { runQualityCheck } from "./quality.js";

export const RESUME_AI_CREDITS = {
  improve_summary: 2,
  rewrite_bullet: 1,
  tailor: 4,
  match: 2,
};

function notConfigured() {
  const err = new Error("AI writing assistance is not currently configured.");
  err.status = 503;
  err.code = "ai_not_configured";
  throw err;
}

function stripResumeForAi(resume, { includeExperience = true } = {}) {
  return {
    target_role: resume.target_role || "",
    target_company: resume.target_company || "",
    basics: {
      title: resume.basics?.title || "",
      summary: resume.basics?.summary || "",
      objective: resume.basics?.objective || "",
    },
    skills: (resume.skills || []).map((s) => (typeof s === "string" ? s : s.name)).slice(0, 40),
    experience: includeExperience
      ? (resume.experience || []).slice(0, 6).map((e) => ({
          role: e.role,
          company: e.company,
          bullets: (e.bullets || []).slice(0, 6),
        }))
      : undefined,
  };
}

async function runAi({ userId, action, systemPrompt, userPayload, credits }) {
  if (!isAiConfigured()) notConfigured();
  await consumeCredits(userId, credits, {
    feature: `resume.${action}`,
    model: getOpenAiModel(),
  });
  const { content } = await runResponses({ systemPrompt, userPayload });
  return content;
}

export async function improveSummary({ userId, resume, tone = "professional" }) {
  const content = await runAi({
    userId,
    action: "improve_summary",
    credits: RESUME_AI_CREDITS.improve_summary,
    systemPrompt: `You improve professional resume summaries.
Return ONLY JSON: { "suggestion": "", "notes": "" }
Rules: Do not invent employers, degrees, metrics, or claims. Keep factual. Tone: ${tone}. Label this as a suggestion for user approval.`,
    userPayload: JSON.stringify({
      task: "improve_summary",
      tone,
      resume: stripResumeForAi(resume, { includeExperience: true }),
      current_summary: resume.basics?.summary || resume.basics?.objective || "",
    }),
  });
  return {
    suggestion: String(content?.suggestion || "").trim(),
    notes: String(content?.notes || "").trim(),
    labeled: "AI-generated suggestion — review before replacing your content.",
    credits_used: RESUME_AI_CREDITS.improve_summary,
  };
}

export async function rewriteBullet({ userId, resume, bullet, style = "achievement" }) {
  const content = await runAi({
    userId,
    action: "rewrite_bullet",
    credits: RESUME_AI_CREDITS.rewrite_bullet,
    systemPrompt: `You rewrite resume bullets.
Return ONLY JSON: { "suggestion": "", "notes": "" }
Rules: Never fabricate metrics or employers. Prefer strong action verbs. If numbers are not in the source, do not invent them. Style: ${style}.`,
    userPayload: JSON.stringify({
      task: "rewrite_bullet",
      style,
      bullet,
      context: stripResumeForAi(resume, { includeExperience: false }),
    }),
  });
  return {
    suggestion: String(content?.suggestion || "").trim(),
    notes: String(content?.notes || "").trim(),
    labeled: "AI-generated suggestion — review before replacing your content.",
    credits_used: RESUME_AI_CREDITS.rewrite_bullet,
  };
}

export async function tailorResume({ userId, resume, jobDescription, targetCompany, targetRole }) {
  const content = await runAi({
    userId,
    action: "tailor",
    credits: RESUME_AI_CREDITS.tailor,
    systemPrompt: `You tailor resume content to a job description.
Return ONLY JSON:
{
  "suggested_summary": "",
  "suggested_bullets": [{ "original": "", "suggestion": "" }],
  "missing_keywords": [""],
  "matched_keywords": [""],
  "notes": ""
}
Rules: Do not invent work history, companies, qualifications, or metrics. Only rewrite based on existing evidence.`,
    userPayload: JSON.stringify({
      task: "tailor_resume",
      target_company: targetCompany || resume.target_company || "",
      target_role: targetRole || resume.target_role || "",
      job_description: String(jobDescription || "").slice(0, 8000),
      resume: stripResumeForAi(resume),
    }),
  });
  return {
    suggested_summary: String(content?.suggested_summary || "").trim(),
    suggested_bullets: Array.isArray(content?.suggested_bullets) ? content.suggested_bullets : [],
    missing_keywords: Array.isArray(content?.missing_keywords) ? content.missing_keywords : [],
    matched_keywords: Array.isArray(content?.matched_keywords) ? content.matched_keywords : [],
    notes: String(content?.notes || "").trim(),
    labeled: "AI-generated suggestions — review and approve before applying.",
    credits_used: RESUME_AI_CREDITS.tailor,
  };
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Transparent match indicator — not a fake ATS score.
 */
export function computeResumeMatch(resume, { jobDescription = "", targetRole = "" } = {}) {
  const jdTokens = [...new Set(tokenize(jobDescription))];
  const roleTokens = tokenize(targetRole || resume.target_role || "");
  const resumeText = [
    resume.basics?.title,
    resume.basics?.summary,
    resume.target_role,
    ...(resume.skills || []).map((s) => (typeof s === "string" ? s : s.name)),
    ...(resume.experience || []).flatMap((e) => [e.role, e.company, ...(e.bullets || [])]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matched = jdTokens.filter((t) => resumeText.includes(t));
  const missing = jdTokens.filter((t) => !resumeText.includes(t)).slice(0, 25);
  const keywordCoverage = jdTokens.length ? matched.length / jdTokens.length : 0;

  const skillNames = (resume.skills || []).map((s) =>
    (typeof s === "string" ? s : s.name || "").toLowerCase(),
  );
  const skillHits = jdTokens.filter((t) => skillNames.some((s) => s.includes(t) || t.includes(s)));
  const skillCoverage = jdTokens.length ? Math.min(1, skillHits.length / Math.max(8, Math.min(jdTokens.length, 20))) : 0;

  const roleRelevance = roleTokens.length
    ? roleTokens.filter((t) => resumeText.includes(t)).length / roleTokens.length
    : resume.target_role
      ? 0.6
      : 0.3;

  const experienceEvidence = Math.min(1, (resume.experience || []).length / 3);
  const quality = runQualityCheck(resume);
  const completeness = Math.min(1, (resume.completion_percentage || 0) / 100);
  const formattingOk = quality.summary.critical === 0 ? 1 : 0.4;

  const indicator = Math.round(
    (keywordCoverage * 0.3 +
      skillCoverage * 0.2 +
      roleRelevance * 0.15 +
      experienceEvidence * 0.15 +
      completeness * 0.1 +
      formattingOk * 0.1) *
      100,
  );

  return {
    indicator,
    breakdown: {
      keyword_coverage: Math.round(keywordCoverage * 100),
      skill_coverage: Math.round(skillCoverage * 100),
      role_title_relevance: Math.round(roleRelevance * 100),
      experience_evidence: Math.round(experienceEvidence * 100),
      section_completeness: Math.round(completeness * 100),
      formatting_checks: Math.round(formattingOk * 100),
    },
    matched_keywords: matched.slice(0, 30),
    missing_keywords: missing,
    quality_issues: quality.summary,
    disclaimer:
      "Resume Match Indicator is guidance based on keyword coverage, skills, role relevance, experience evidence, completeness, and formatting checks. It is not a guarantee of ATS or hiring-system performance.",
  };
}

export function getAiAssistStatus() {
  return {
    enabled: isAiConfigured(),
    message: isAiConfigured()
      ? "AI writing assistance is available."
      : "AI writing assistance is not currently configured.",
    credits: RESUME_AI_CREDITS,
  };
}
