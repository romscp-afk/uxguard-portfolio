import { failedCheck, notTestedCheck, passedCheck, warningCheck } from "../check-result.js";

/**
 * @param {{ available: boolean; findings?: object[]; reason?: string; rendered?: object }} playwright
 */
export function runPlaywrightChecks(playwright) {
  if (!playwright?.available) {
    return [
      notTestedCheck({
        checkId: "mobile.rendered_analysis",
        category: "mobile_experience",
        metric: "Rendered mobile analysis",
        maxScore: 10,
        measurementSource: "rendered_dom",
        evidence: [playwright?.reason || "Playwright rendering is disabled in this environment."],
        affectedElements: ["page"],
        explanation: "Overflow, tap targets, and mobile navigation require rendered DOM analysis.",
        recommendation: "Enable UX_AUDIT_PLAYWRIGHT=1 on environments with Chromium installed.",
        expectedUxOutcome: "Deeper mobile UX signals.",
        potentialBusinessImpact: "Some mobile checks remain unavailable.",
        estimatedEffort: "medium",
        businessImpact: "medium",
      }),
    ];
  }

  const checks = [];
  const findings = playwright.findings || [];

  const overflow = findings.find((f) => /overflow/i.test(f.title));
  if (overflow) {
    checks.push(
      failedCheck({
        checkId: "mobile.overflow",
        category: "mobile_experience",
        metric: "Horizontal overflow",
        maxScore: 10,
        severity: "high",
        confidence: "high",
        measurementSource: "rendered_dom",
        evidence: [overflow.evidence],
        affectedElements: ["page layout"],
        explanation: overflow.explanation,
        recommendation: overflow.recommendation,
        expectedUxOutcome: overflow.expected_ux_outcome,
        potentialBusinessImpact: overflow.potential_business_effect,
        estimatedEffort: overflow.estimated_effort,
        businessImpact: "high",
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "mobile.overflow",
        category: "mobile_experience",
        metric: "Horizontal overflow",
        maxScore: 10,
        confidence: "high",
        measurementSource: "rendered_dom",
        evidence: ["No horizontal overflow detected at 390px viewport width."],
        affectedElements: ["page layout"],
        explanation: "Content fits within the mobile viewport width.",
        recommendation: "Re-test after major layout changes.",
        expectedUxOutcome: "No sideways scrolling on mobile.",
        potentialBusinessImpact: "Supports mobile readability.",
        businessImpact: "medium",
      }),
    );
  }

  const tapTargets = findings.find((f) => /tap target/i.test(f.title));
  if (tapTargets) {
    checks.push(
      warningCheck({
        checkId: "mobile.tap_targets",
        category: "mobile_experience",
        metric: "Touch target size",
        maxScore: 8,
        severity: "medium",
        confidence: "medium",
        measurementSource: "rendered_dom",
        evidence: [tapTargets.evidence],
        affectedElements: ["button", "a"],
        explanation: tapTargets.explanation,
        recommendation: tapTargets.recommendation,
        expectedUxOutcome: tapTargets.expected_ux_outcome,
        potentialBusinessImpact: tapTargets.potential_business_effect,
        estimatedEffort: tapTargets.estimated_effort,
        businessImpact: "medium",
        scoreRatio: 0.45,
      }),
    );
  } else {
    checks.push(
      passedCheck({
        checkId: "mobile.tap_targets",
        category: "mobile_experience",
        metric: "Touch target size",
        maxScore: 8,
        confidence: "medium",
        measurementSource: "rendered_dom",
        evidence: ["No significant small tap-target pattern detected in sampled elements."],
        affectedElements: ["button", "a"],
        explanation: "Interactive elements appear reasonably sized in the mobile viewport sample.",
        recommendation: "Verify primary actions on real devices.",
        expectedUxOutcome: "Easier tapping on mobile.",
        potentialBusinessImpact: "Supports mobile conversion actions.",
        businessImpact: "low",
      }),
    );
  }

  return checks;
}
