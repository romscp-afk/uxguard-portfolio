import { failedCheck, passedCheck } from "../check-result.js";

/**
 * Convert link scan findings into structured checks.
 * @param {object[]} linkFindings
 */
export function runLinkChecks(linkFindings) {
  if (!linkFindings?.length) {
    return [
      passedCheck({
        checkId: "usability.broken_links",
        category: "usability_navigation",
        metric: "Broken internal links",
        maxScore: 8,
        confidence: "high",
        measurementSource: "html",
        evidence: ["No broken same-origin links detected in the sampled link set."],
        affectedElements: ["a"],
        explanation: "Sampled internal links responded successfully.",
        recommendation: "Re-check after site restructuring.",
        expectedUxOutcome: "Reliable internal navigation.",
        potentialBusinessImpact: "Reduces dead-end journeys.",
        businessImpact: "low",
      }),
    ];
  }

  const finding = linkFindings[0];
  return [
    failedCheck({
      checkId: "usability.broken_links",
      category: "usability_navigation",
      metric: "Broken internal links",
      maxScore: 8,
      severity: finding.severity === "high" ? "high" : "medium",
      confidence: "high",
      measurementSource: "html",
      evidence: [finding.evidence],
      affectedElements: finding.affected_element ? [finding.affected_element] : ["a"],
      explanation: finding.explanation,
      recommendation: finding.recommendation,
      expectedUxOutcome: finding.expected_ux_outcome,
      potentialBusinessImpact: finding.potential_business_effect,
      estimatedEffort: finding.estimated_effort,
      businessImpact: finding.business_impact,
    }),
  ];
}
