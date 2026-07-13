/** Configurable AI credit costs and limits — never trust client-supplied costs. */
export const AI_CREDIT_COSTS = {
  // Case Study Builder
  "generate-complete": 5,
  "generate-section": 2,
  "rewrite-section": 1,
  "improve-impact": 2,
  "generate-reflection": 2,
  // Research Assistant
  "research-plan": 3,
  "interview-questions": 1,
  "survey-questions": 1,
  "usability-script": 2,
  "research-summary": 3,
  "findings-recommendations": 3,
  // Product Documentation
  "prd": 6,
  "brd": 6,
  "user-stories": 3,
  "acceptance-criteria": 2,
  "feature-requirements": 3,
  "risks-dependencies": 2,
  // Portfolio Reviewer
  "storytelling-review": 5,
  "completeness-review": 5,
  "seniority-review": 5,
  "impact-review": 5,
  "recruiter-review": 5,
  "recommended-improvements": 5,
  // Workspace transforms
  "shorten": 1,
  "expand": 1,
  "make-professional": 1,
  "regenerate": 2,
};

export const DEFAULT_MONTHLY_ALLOWANCE = Number(process.env.AI_MONTHLY_CREDITS || 100);
export const MAX_INPUT_CHARS = 24000;
export const MAX_REQUESTS_PER_HOUR = Number(process.env.AI_RATE_LIMIT_PER_HOUR || 30);

export const ASSISTANT_TYPES = new Set([
  "case-study",
  "research",
  "documentation",
  "portfolio-review",
]);

export function getOpenAiModel() {
  // Free/trial accounts may only allow certain models — override with OPENAI_MODEL in Vercel.
  return process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
}

export function getOpenAiApiKey() {
  return (process.env.OPENAI_API_KEY || "").trim();
}

export function creditCostForAction(action) {
  const cost = AI_CREDIT_COSTS[action];
  if (!Number.isFinite(cost)) {
    const error = new Error("Unknown or unsupported AI action.");
    error.status = 400;
    error.code = "invalid_action";
    throw error;
  }
  return cost;
}
