import {
  BUSINESS_IMPACT_WEIGHT,
  CATEGORY_WEIGHTS,
  CONFIDENCE_WEIGHT,
  EFFORT_DIVISOR,
  SEVERITY_PENALTY,
  SEVERITY_WEIGHT,
} from "./constants.js";

/**
 * Priority = (severity × confidence × business impact) ÷ effort
 * Higher scores surface first in the roadmap.
 */
export function calculatePriorityScore(finding) {
  const severity = SEVERITY_WEIGHT[finding.severity] || 1;
  const confidence = CONFIDENCE_WEIGHT[finding.confidence] || 1;
  const business = BUSINESS_IMPACT_WEIGHT[finding.business_impact] || 2;
  const effort = EFFORT_DIVISOR[finding.estimated_effort] || 2;
  return Math.round(((severity * confidence * business) / effort) * 10) / 10;
}

export function scoreCategory(findings, category) {
  const relevant = findings.filter((f) => f.category === category);
  if (!relevant.length) return 92;
  const penalty = relevant.reduce((sum, f) => sum + (SEVERITY_PENALTY[f.severity] || 3), 0);
  return Math.max(35, Math.min(100, 100 - penalty));
}

export function calculateOverallScore(categoryScores) {
  let total = 0;
  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const row = categoryScores.find((c) => c.category === category);
    total += (row?.score || 70) * weight;
  }
  return Math.round(total);
}

export function growthOpportunityLabel(score) {
  if (score >= 85) return "Low";
  if (score >= 70) return "Medium";
  if (score >= 55) return "Medium–High";
  return "High";
}

export function buildCategoryScores(findings) {
  return Object.entries(CATEGORY_WEIGHTS).map(([category, weight]) => {
    const score = scoreCategory(findings, category);
    const count = findings.filter((f) => f.category === category).length;
    return {
      category,
      score,
      weight,
      summary:
        count === 0
          ? "No major automated signals detected in this category."
          : `${count} observation${count === 1 ? "" : "s"} flagged for review.`,
    };
  });
}

export function enrichFindings(findings) {
  return findings
    .map((f) => ({
      ...f,
      priority_score: calculatePriorityScore(f),
    }))
    .sort((a, b) => b.priority_score - a.priority_score);
}

export function roadmapBuckets(findings) {
  const sorted = [...findings].sort((a, b) => b.priority_score - a.priority_score);
  return {
    fix_now: sorted.filter((f) => f.severity === "critical" || f.severity === "high").slice(0, 5),
    improve_next: sorted.filter((f) => f.severity === "medium").slice(0, 6),
    investigate_further: sorted.filter(
      (f) => f.severity === "low" || f.confidence === "requires_expert_review",
    ).slice(0, 6),
  };
}
