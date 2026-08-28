import { runHtmlChecks } from "./run-html-checks.js";
import { runPerformanceChecks } from "./run-performance-checks.js";
import { runPlaywrightChecks } from "./run-playwright-checks.js";
import { runLinkChecks } from "./run-link-checks.js";
import { scanInternalLinks } from "../scan-links.js";
import { scanWithPlaywright } from "../scan-playwright.js";
import { fetchPageSpeedMetrics } from "../pagespeed.js";
import { scanInlineContrast } from "../scan-contrast.js";
import { warningCheck } from "../check-result.js";

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

function inlineContrastChecks(html) {
  const legacyFindings = scanInlineContrast(html);
  if (!legacyFindings.length) {
    return [];
  }
  const f = legacyFindings[0];
  return [
    warningCheck({
      checkId: "a11y.inline_contrast",
      category: "accessibility",
      metric: "Inline colour contrast (limited)",
      maxScore: 6,
      severity: "medium",
      confidence: "low",
      measurementSource: "html",
      evidence: [f.evidence],
      affectedElements: ["inline-styled text"],
      explanation:
        "Some inline-styled text may not meet contrast expectations. External CSS was not evaluated.",
      recommendation: f.recommendation,
      expectedUxOutcome: f.expected_ux_outcome,
      potentialBusinessImpact: f.potential_business_effect,
      estimatedEffort: f.estimated_effort,
      businessImpact: f.business_impact,
      requiresExpertReview: true,
      scoreRatio: 0.4,
    }),
  ];
}

/**
 * @param {object} input
 */
export async function runAllChecks(input) {
  const { html, pageUrl, responseTimeMs, isHttps, context = {}, fetchOptions = {} } = input;

  const htmlChecks = runHtmlChecks({ html, pageUrl, responseTimeMs, isHttps, context });
  const contrastChecks = inlineContrastChecks(html);

  const [linkFindings, pagespeed, playwright] = await Promise.all([
    withTimeout(scanInternalLinks(html, pageUrl, fetchOptions), 12_000, []),
    withTimeout(fetchPageSpeedMetrics(pageUrl, fetchOptions), 18_000, {
      configured: false,
      error: "PageSpeed request timed out",
    }),
    scanWithPlaywright(pageUrl, fetchOptions),
  ]);

  const linkChecks = runLinkChecks(linkFindings);
  const performanceChecks = runPerformanceChecks(pagespeed);
  const playwrightChecks = runPlaywrightChecks(playwright);

  const checks = [
    ...htmlChecks,
    ...contrastChecks,
    ...linkChecks,
    ...performanceChecks,
    ...playwrightChecks,
  ];

  const dataSources = ["html"];
  if (pagespeed?.configured && !pagespeed?.error) dataSources.push("pagespeed");
  if (playwright?.available) dataSources.push("rendered_dom");

  return {
    checks,
    pagespeed,
    playwright,
    linkFindings,
    data_sources: dataSources,
    pages_scanned: [{ url: pageUrl, label: "Submitted page" }],
  };
}
