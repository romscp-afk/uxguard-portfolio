import { fetchPublicPage } from "./fetch-page.js";
import { normalizeAuditUrl } from "./url.js";
import { runAllChecks } from "./checks/run-all-checks.js";
import { SCAN_LIMITATIONS, SCAN_VERSION, SCORING_MODEL_VERSION } from "./constants.js";
import {
  ANALYTICS_PLACEHOLDER,
  USER_RESEARCH_PLACEHOLDER,
  buildCategoryScoresFromChecks,
  buildCheckSummary,
  calculateAuditCoverage,
  calculateOverallScoreFromCategories,
  checksToFindings,
  growthOpportunityFromChecks,
  growthOpportunityMessage,
  identifyQuickWins,
  roadmapBucketsFromFindings,
  scoreInterpretation,
} from "./scoring-v3.js";

function buildLimitations(capabilities, dataSources) {
  const limits = [...SCAN_LIMITATIONS];
  if (!dataSources.includes("pagespeed")) {
    limits.push("Core Web Vitals were not available — performance category may be incomplete.");
  }
  if (!capabilities.playwright?.available) {
    limits.push("Rendered mobile and contrast checks were limited without browser rendering.");
  }
  return limits;
}

/**
 * Run the evidence-based audit pipeline without persisting.
 */
export async function executeUxAuditScan(websiteUrl, options = {}) {
  const urlInfo = normalizeAuditUrl(websiteUrl);
  const fetchResult = await fetchPublicPage(urlInfo.normalized, options.fetchOptions || {});
  const businessContext = options.context || {};

  const scan = await runAllChecks({
    html: fetchResult.html,
    pageUrl: fetchResult.finalUrl,
    responseTimeMs: fetchResult.responseTimeMs,
    isHttps: fetchResult.finalUrl.startsWith("https:"),
    context: businessContext,
    fetchOptions: options.fetchOptions || {},
  });

  const category_scores = buildCategoryScoresFromChecks(scan.checks);
  const overall_score = calculateOverallScoreFromCategories(category_scores);
  const audit_coverage = calculateAuditCoverage(scan.checks);
  const score_incomplete = category_scores.some((c) => c.score == null);
  const findings = checksToFindings(scan.checks);
  const roadmap = roadmapBucketsFromFindings(findings);
  const growth_opportunity = growthOpportunityFromChecks(scan.checks, category_scores, overall_score);
  const growth_message = growthOpportunityMessage(growth_opportunity, scan.checks);
  const quick_wins = identifyQuickWins(findings);

  const capabilities = {
    pagespeed: scan.pagespeed,
    playwright: {
      available: Boolean(scan.playwright?.available),
      reason: scan.playwright?.reason || null,
      rendered: scan.playwright?.rendered || null,
    },
    data_sources: scan.data_sources,
  };

  return {
    normalized_url: fetchResult.finalUrl,
    website_url: websiteUrl,
    overall_score,
    score_interpretation: scoreInterpretation(overall_score),
    audit_coverage,
    score_incomplete,
    growth_opportunity,
    growth_message,
    category_scores,
    checks: scan.checks,
    check_summary: buildCheckSummary(scan.checks),
    findings,
    roadmap,
    summary: {
      critical_issues: findings.filter((f) => f.severity === "critical").length,
      improvement_opportunities: findings.length,
      quick_wins: quick_wins.length,
      response_time_ms: fetchResult.responseTimeMs,
      http_status: fetchResult.status,
      performance_metrics:
        scan.pagespeed?.configured && !scan.pagespeed?.error
          ? {
              performance_score: scan.pagespeed.performance_score,
              lcp_ms: scan.pagespeed.lcp_ms,
              cls: scan.pagespeed.cls,
              inp_ms: scan.pagespeed.inp_ms,
              fcp_ms: scan.pagespeed.fcp_ms,
              ttfb_ms: scan.pagespeed.ttfb_ms,
              strategy: scan.pagespeed.strategy || "mobile",
              source: scan.pagespeed.source || "pagespeed",
            }
          : null,
    },
    pages_scanned: scan.pages_scanned,
    analytics_metrics: ANALYTICS_PLACEHOLDER,
    user_research_metrics: USER_RESEARCH_PLACEHOLDER,
    limitations: buildLimitations(capabilities, scan.data_sources),
    scan_version: SCAN_VERSION,
    scoring_model_version: SCORING_MODEL_VERSION,
    capabilities,
  };
}
