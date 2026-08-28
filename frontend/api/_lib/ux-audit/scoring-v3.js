import {
  BUSINESS_IMPACT_WEIGHT,
  CATEGORY_LABELS,
  CATEGORY_WEIGHTS,
  EFFORT_DIVISOR,
  PRIORITY_CONFIDENCE,
  SEVERITY_WEIGHT,
} from "./constants.js";
import { SCORABLE_STATUSES } from "./check-result.js";

function normalizeConfidence(confidence) {
  return PRIORITY_CONFIDENCE[confidence] != null ? confidence : "medium";
}

function confidenceMultiplier(confidence) {
  const key = normalizeConfidence(confidence);
  return PRIORITY_CONFIDENCE[key] ?? 0.7;
}

/**
 * Priority = Severity × Business Impact × Confidence ÷ Effort
 */
export function calculatePriorityScoreV3(check) {
  if (!check.severity) return 0;
  const severity = SEVERITY_WEIGHT[check.severity] || 1;
  const business = BUSINESS_IMPACT_WEIGHT[check.businessImpact] || 2;
  const confidence = confidenceMultiplier(check.confidence);
  const effort = EFFORT_DIVISOR[check.estimatedEffort] || 2;
  return Math.round(((severity * business * confidence) / effort) * 10) / 10;
}

export function scoreCategoryFromChecks(checks, category) {
  const inCategory = checks.filter((c) => c.category === category);
  const scorable = inCategory.filter((c) => SCORABLE_STATUSES.has(c.status));
  const completedWeight = scorable.reduce((sum, c) => sum + c.maxScore, 0);
  const totalApplicableWeight = inCategory
    .filter((c) => c.status !== "not_applicable" && c.status !== "manual_review")
    .reduce((sum, c) => sum + c.maxScore, 0);

  if (!scorable.length) {
    return {
      category,
      score: null,
      weight: CATEGORY_WEIGHTS[category],
      coverage: totalApplicableWeight
        ? Math.round((completedWeight / totalApplicableWeight) * 100)
        : 0,
      checks_completed: 0,
      checks_passed: 0,
      checks_warning: 0,
      checks_failed: 0,
      checks_manual: inCategory.filter((c) => c.status === "manual_review").length,
      checks_unavailable: inCategory.filter((c) => c.status === "not_tested").length,
      summary: "No automated checks were completed in this category.",
    };
  }

  const earned = scorable.reduce((sum, c) => sum + (c.score ?? 0), 0);
  const max = scorable.reduce((sum, c) => sum + c.maxScore, 0);
  const score = max ? Math.round((earned / max) * 100) : null;

  return {
    category,
    score,
    weight: CATEGORY_WEIGHTS[category],
    coverage: totalApplicableWeight
      ? Math.round((completedWeight / totalApplicableWeight) * 100)
      : 100,
    checks_completed: scorable.length,
    checks_passed: scorable.filter((c) => c.status === "passed").length,
    checks_warning: scorable.filter((c) => c.status === "warning").length,
    checks_failed: scorable.filter((c) => c.status === "failed").length,
    checks_manual: inCategory.filter((c) => c.status === "manual_review").length,
    checks_unavailable: inCategory.filter((c) => c.status === "not_tested").length,
    summary: `${scorable.length} automated check${scorable.length === 1 ? "" : "s"} completed in ${CATEGORY_LABELS[category] || category}.`,
  };
}

export function buildCategoryScoresFromChecks(checks) {
  return Object.keys(CATEGORY_WEIGHTS).map((category) => scoreCategoryFromChecks(checks, category));
}

export function calculateAuditCoverage(checks) {
  const applicableAutomated = checks.filter(
    (c) => c.status !== "not_applicable" && c.status !== "manual_review",
  );
  const completed = applicableAutomated.filter((c) => SCORABLE_STATUSES.has(c.status));
  const targetWeight = applicableAutomated.reduce((sum, c) => sum + c.maxScore, 0);
  const completedWeight = completed.reduce((sum, c) => sum + c.maxScore, 0);
  if (!targetWeight) return 0;
  return Math.round((completedWeight / targetWeight) * 100);
}

export function calculateOverallScoreFromCategories(categoryScores) {
  const tested = categoryScores.filter((row) => row.score != null);
  if (!tested.length) return null;

  let weightSum = 0;
  let weighted = 0;
  for (const row of tested) {
    const w = CATEGORY_WEIGHTS[row.category] ?? 0;
    weightSum += w;
    weighted += row.score * w;
  }
  if (!weightSum) return null;
  return Math.round(weighted / weightSum);
}

export function scoreInterpretation(score) {
  if (score == null) return "Incomplete";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  if (score >= 50) return "Weak";
  return "Critical";
}

export function growthOpportunityFromChecks(checks, categoryScores, overallScore) {
  const conversion = categoryScores.find((c) => c.category === "conversion_experience");
  const convScore = conversion?.score ?? overallScore ?? 70;
  const failedHigh = checks.filter(
    (c) => c.status === "failed" && (c.severity === "critical" || c.severity === "high"),
  ).length;
  const coverage = calculateAuditCoverage(checks);

  if (convScore < 55 || failedHigh >= 5) return "Very high";
  if (convScore < 70 || failedHigh >= 3) return "High";
  if (convScore < 80 || coverage < 70) return "Moderate";
  return "Low";
}

export function growthOpportunityMessage(label, checks) {
  const themes = [];
  const failed = checks.filter((c) => c.status === "failed" || c.status === "warning");
  if (failed.some((c) => c.category === "conversion_experience")) themes.push("calls to action and forms");
  if (failed.some((c) => c.category === "mobile_experience")) themes.push("mobile experience");
  if (failed.some((c) => c.category === "content_trust")) themes.push("trust communication");
  if (failed.some((c) => c.category === "performance")) themes.push("performance barriers");
  const joined = themes.slice(0, 3).join(", ");
  if (label === "Low") return "Lower improvement opportunity: Few high-confidence automated barriers were detected.";
  if (!joined) return `${label} improvement opportunity: Review category scores for prioritised next steps.`;
  return `${label} improvement opportunity: The audit identified high-confidence signals affecting ${joined}.`;
}

export function checksToFindings(checks) {
  return checks
    .filter((c) => c.status === "failed" || c.status === "warning")
    .filter((c) => c.severity)
    .filter((c) => {
      const conf = normalizeConfidence(c.confidence);
      if (c.severity === "critical" && (conf === "low" || conf === "requires_expert_review")) return false;
      return true;
    })
    .map((c) => ({
      check_id: c.checkId,
      title: c.metric,
      explanation: c.explanation,
      evidence: c.evidence.join(" "),
      evidence_items: c.evidence,
      category: c.category,
      status: c.status,
      severity: c.severity,
      confidence:
        c.confidence === "high"
          ? "confirmed"
          : c.confidence === "low"
            ? "requires_expert_review"
            : "likely",
      affected_element: c.affectedElements.join(", ") || "page",
      affected_elements: c.affectedElements,
      recommendation: c.recommendation,
      expected_ux_outcome: c.expectedUxOutcome,
      potential_business_effect: c.potentialBusinessImpact,
      estimated_effort: c.estimatedEffort,
      business_impact: c.businessImpact,
      measurement_source: c.measurementSource,
      requires_expert_review: c.requiresExpertReview,
      priority_score: calculatePriorityScoreV3(c),
    }))
    .sort((a, b) => b.priority_score - a.priority_score);
}

export function buildCheckSummary(checks) {
  return {
    total: checks.length,
    passed: checks.filter((c) => c.status === "passed").length,
    warning: checks.filter((c) => c.status === "warning").length,
    failed: checks.filter((c) => c.status === "failed").length,
    not_applicable: checks.filter((c) => c.status === "not_applicable").length,
    not_tested: checks.filter((c) => c.status === "not_tested").length,
    manual_review: checks.filter((c) => c.status === "manual_review").length,
  };
}

export function identifyQuickWins(findings) {
  return findings
    .filter(
      (f) =>
        f.estimated_effort === "low" &&
        (f.business_impact === "high" || f.business_impact === "medium") &&
        f.confidence !== "requires_expert_review",
    )
    .slice(0, 8);
}

export function roadmapBucketsFromFindings(findings) {
  const sorted = [...findings].sort((a, b) => b.priority_score - a.priority_score);
  return {
    fix_now: sorted
      .filter((f) => f.severity === "critical" || f.severity === "high")
      .slice(0, 6),
    improve_next: sorted.filter((f) => f.severity === "medium").slice(0, 6),
    investigate_further: sorted
      .filter((f) => f.severity === "low" || f.requires_expert_review)
      .slice(0, 6),
  };
}

export const ANALYTICS_PLACEHOLDER = {
  available: false,
  message: "Connect your analytics data for deeper behavioural insights.",
  metrics: [
    "Conversion rate",
    "Engagement rate",
    "Funnel completion",
    "Form abandonment",
    "Checkout abandonment",
    "Search success",
  ],
};

export const USER_RESEARCH_PLACEHOLDER = {
  available: false,
  message: "Available through expert UX research.",
  metrics: ["System Usability Scale", "Task success rate", "Customer effort score", "Qualitative pain points"],
};
