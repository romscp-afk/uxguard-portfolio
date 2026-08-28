/** @typedef {'passed'|'warning'|'failed'|'not_applicable'|'not_tested'|'manual_review'} AuditCheckStatus */
/** @typedef {'high'|'medium'|'low'} AuditConfidence */
/** @typedef {'conversion_experience'|'usability_navigation'|'accessibility'|'mobile_experience'|'content_trust'|'performance'} AuditCategory */

/**
 * @param {Partial<import('./check-types.js').AuditCheckResult> & { checkId: string; category: string; metric: string; status: AuditCheckStatus; maxScore: number }>} partial
 */
export function createCheck(partial) {
  return {
    checkId: partial.checkId,
    category: partial.category,
    metric: partial.metric,
    status: partial.status,
    score: partial.score ?? null,
    maxScore: partial.maxScore,
    severity: partial.severity ?? null,
    confidence: partial.confidence ?? "medium",
    evidence: partial.evidence ?? [],
    affectedElements: partial.affectedElements ?? [],
    explanation: partial.explanation ?? "",
    recommendation: partial.recommendation ?? "",
    expectedUxOutcome: partial.expectedUxOutcome ?? "",
    potentialBusinessImpact: partial.potentialBusinessImpact ?? "",
    estimatedEffort: partial.estimatedEffort ?? "medium",
    measurementSource: partial.measurementSource ?? "html",
    requiresExpertReview: Boolean(partial.requiresExpertReview),
    businessImpact: partial.businessImpact ?? "medium",
  };
}

export function passedCheck(partial) {
  return createCheck({
    ...partial,
    status: "passed",
    score: partial.maxScore,
    severity: null,
  });
}

export function failedCheck(partial) {
  return createCheck({
    ...partial,
    status: "failed",
    score: 0,
    severity: partial.severity ?? "high",
  });
}

export function warningCheck(partial) {
  const ratio = partial.scoreRatio ?? 0.5;
  return createCheck({
    ...partial,
    status: "warning",
    score: Math.round(partial.maxScore * ratio),
    severity: partial.severity ?? "medium",
  });
}

export function notApplicableCheck(partial) {
  return createCheck({
    ...partial,
    status: "not_applicable",
    score: null,
    maxScore: partial.maxScore ?? 0,
    severity: null,
  });
}

export function notTestedCheck(partial) {
  return createCheck({
    ...partial,
    status: "not_tested",
    score: null,
    severity: null,
    explanation:
      partial.explanation ||
      "This check could not be completed automatically in the current scan environment.",
  });
}

export function manualReviewCheck(partial) {
  return createCheck({
    ...partial,
    status: "manual_review",
    score: null,
    severity: null,
    requiresExpertReview: true,
    confidence: "low",
    explanation:
      partial.explanation ||
      "This signal benefits from expert human review rather than automated scoring.",
  });
}

export const SCORABLE_STATUSES = new Set(["passed", "warning", "failed"]);
