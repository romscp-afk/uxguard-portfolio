import { failedCheck, notTestedCheck, passedCheck, warningCheck } from "../check-result.js";

function thresholdCheck({ checkId, metric, value, good, needsImprovement, unit, evidenceLabel }) {
  if (value == null) {
    return notTestedCheck({
      checkId,
      category: "performance",
      metric,
      maxScore: 10,
      measurementSource: "pagespeed",
      evidence: [`${evidenceLabel} was not returned by PageSpeed.`],
      affectedElements: ["page performance"],
      explanation: "The performance metric was unavailable from the external service.",
      recommendation: "Retry the audit or verify PageSpeed API configuration.",
      expectedUxOutcome: "Complete performance picture.",
      potentialBusinessImpact: "Incomplete performance assessment.",
      estimatedEffort: "low",
      businessImpact: "medium",
    });
  }

  if (value <= good) {
    return passedCheck({
      checkId,
      category: "performance",
      metric,
      maxScore: 10,
      confidence: "high",
      measurementSource: "pagespeed",
      evidence: [`${evidenceLabel}: ${value}${unit} (good threshold ≤ ${good}${unit}).`],
      affectedElements: ["page performance"],
      explanation: `${metric} is within the good range.`,
      recommendation: "Maintain current performance practices.",
      expectedUxOutcome: "Responsive experience.",
      potentialBusinessImpact: "Supports user confidence.",
      businessImpact: "medium",
    });
  }

  if (value <= needsImprovement) {
    return warningCheck({
      checkId,
      category: "performance",
      metric,
      maxScore: 10,
      severity: "medium",
      confidence: "high",
      measurementSource: "pagespeed",
      evidence: [`${evidenceLabel}: ${value}${unit} (needs improvement).`],
      affectedElements: ["page performance"],
      explanation: `${metric} may create friction for some visitors.`,
      recommendation: "Prioritise optimisations for this Core Web Vital.",
      expectedUxOutcome: "Improved perceived performance.",
      potentialBusinessImpact: "May be a conversion opportunity on slower connections.",
      estimatedEffort: "medium",
      businessImpact: "medium",
      scoreRatio: 0.45,
    });
  }

  return failedCheck({
    checkId,
    category: "performance",
    metric,
    maxScore: 10,
    severity: "high",
    confidence: "high",
    measurementSource: "pagespeed",
    evidence: [`${evidenceLabel}: ${value}${unit} (poor).`],
    affectedElements: ["page performance"],
    explanation: `${metric} indicates a meaningful performance barrier.`,
    recommendation: "Investigate hosting, assets, and main-thread work affecting this metric.",
    expectedUxOutcome: "Faster, more stable experience.",
    potentialBusinessImpact: "May reduce bounce and improve task completion.",
    estimatedEffort: "high",
    businessImpact: "high",
  });
}

/**
 * @param {object} pagespeed
 */
export function runPerformanceChecks(pagespeed) {
  if (!pagespeed?.configured) {
    return [
      notTestedCheck({
        checkId: "performance.pagespeed",
        category: "performance",
        metric: "Core Web Vitals (PageSpeed)",
        maxScore: 10,
        measurementSource: "pagespeed",
        evidence: [pagespeed?.reason || "PageSpeed API is not configured."],
        affectedElements: ["page performance"],
        explanation: "Core Web Vitals require the PageSpeed Insights API.",
        recommendation: "Set GOOGLE_PAGESPEED_API_KEY to enable mobile performance metrics.",
        expectedUxOutcome: "Lab and field performance visibility.",
        potentialBusinessImpact: "Incomplete performance assessment without external metrics.",
        estimatedEffort: "low",
        businessImpact: "medium",
      }),
    ];
  }

  if (pagespeed.error) {
    return [
      notTestedCheck({
        checkId: "performance.pagespeed",
        category: "performance",
        metric: "Core Web Vitals (PageSpeed)",
        maxScore: 10,
        measurementSource: "pagespeed",
        evidence: [pagespeed.error, pagespeed.detail].filter(Boolean),
        affectedElements: ["page performance"],
        explanation: "PageSpeed could not be retrieved for this URL.",
        recommendation: "Retry later or verify API quota and URL accessibility.",
        expectedUxOutcome: "Complete performance metrics.",
        potentialBusinessImpact: "Performance category may be incomplete.",
        estimatedEffort: "low",
        businessImpact: "medium",
      }),
    ];
  }

  return [
    thresholdCheck({
      checkId: "performance.lcp",
      metric: "Largest Contentful Paint",
      value: pagespeed.lcp_ms,
      good: 2500,
      needsImprovement: 4000,
      unit: "ms",
      evidenceLabel: "Mobile LCP",
    }),
    thresholdCheck({
      checkId: "performance.inp",
      metric: "Interaction to Next Paint",
      value: pagespeed.inp_ms,
      good: 200,
      needsImprovement: 500,
      unit: "ms",
      evidenceLabel: "Mobile INP/FID proxy",
    }),
    thresholdCheck({
      checkId: "performance.cls",
      metric: "Cumulative Layout Shift",
      value: pagespeed.cls,
      good: 0.1,
      needsImprovement: 0.25,
      unit: "",
      evidenceLabel: "Mobile CLS",
    }),
    pagespeed.performance_score != null
      ? pagespeed.performance_score >= 50
        ? passedCheck({
            checkId: "performance.lighthouse_score",
            category: "performance",
            metric: "Lighthouse performance score",
            maxScore: 8,
            confidence: "high",
            measurementSource: "pagespeed",
            evidence: [`Performance score: ${pagespeed.performance_score}/100 (mobile lab).`],
            affectedElements: ["page performance"],
            explanation: "Overall Lighthouse performance is acceptable.",
            recommendation: "Continue monitoring Core Web Vitals.",
            expectedUxOutcome: "Stable performance baseline.",
            potentialBusinessImpact: "Supports reliable experience.",
            businessImpact: "medium",
          })
        : failedCheck({
            checkId: "performance.lighthouse_score",
            category: "performance",
            metric: "Lighthouse performance score",
            maxScore: 8,
            severity: "high",
            confidence: "high",
            measurementSource: "pagespeed",
            evidence: [`Performance score: ${pagespeed.performance_score}/100 (mobile lab).`],
            affectedElements: ["page performance"],
            explanation: "Low Lighthouse performance suggests meaningful technical friction.",
            recommendation: "Prioritise image, script, and server optimisations.",
            expectedUxOutcome: "Faster experience across devices.",
            potentialBusinessImpact: "May reduce bounce on slower connections.",
            estimatedEffort: "high",
            businessImpact: "high",
          })
      : notTestedCheck({
          checkId: "performance.lighthouse_score",
          category: "performance",
          metric: "Lighthouse performance score",
          maxScore: 8,
          measurementSource: "pagespeed",
          evidence: ["Lighthouse performance score unavailable."],
          affectedElements: ["page performance"],
          explanation: "Score was not returned by PageSpeed.",
          recommendation: "Retry the audit.",
          expectedUxOutcome: "Complete lab performance data.",
          potentialBusinessImpact: "Incomplete performance assessment.",
          estimatedEffort: "low",
          businessImpact: "low",
        }),
  ];
}
