import { fetchPublicPage } from "./fetch-page.js";
import { normalizeAuditUrl } from "./url.js";
import { scanHtml, SCAN_LIMITATIONS } from "./scan-html.js";
import { scanInlineContrast } from "./scan-contrast.js";
import { scanInternalLinks } from "./scan-links.js";
import { fetchPageSpeedMetrics, pageSpeedFindings } from "./pagespeed.js";
import { scanWithPlaywright } from "./scan-playwright.js";
import {
  buildCategoryScores,
  calculateOverallScore,
  enrichFindings,
  growthOpportunityLabel,
  roadmapBuckets,
} from "./scoring.js";
import { SCAN_VERSION } from "./constants.js";

function buildLimitations(capabilities) {
  const limits = [...SCAN_LIMITATIONS];
  if (capabilities.pagespeed?.configured && !capabilities.pagespeed?.error) {
    limits[2] = "Colour contrast from external stylesheets may still require expert review.";
  }
  if (capabilities.playwright?.available) {
    limits[1] = "JavaScript-rendered content was partially evaluated with a headless browser.";
  }
  return limits;
}

/**
 * Run the full Phase 2 audit pipeline without persisting.
 */
export async function executeUxAuditScan(websiteUrl, options = {}) {
  const urlInfo = normalizeAuditUrl(websiteUrl);
  const fetchResult = await fetchPublicPage(urlInfo.normalized, options.fetchOptions || {});

  const htmlFindings = scanHtml({
    html: fetchResult.html,
    pageUrl: fetchResult.finalUrl,
    responseTimeMs: fetchResult.responseTimeMs,
    isHttps: fetchResult.finalUrl.startsWith("https:"),
  });

  const contrastFindings = scanInlineContrast(fetchResult.html);
  const linkFindings = await scanInternalLinks(fetchResult.html, fetchResult.finalUrl, options.fetchOptions || {});

  const [pagespeed, playwright] = await Promise.all([
    fetchPageSpeedMetrics(fetchResult.finalUrl, options),
    scanWithPlaywright(fetchResult.finalUrl, options),
  ]);

  const pagespeedFindings = pageSpeedFindings(pagespeed);
  const allFindings = [
    ...htmlFindings,
    ...contrastFindings,
    ...linkFindings,
    ...pagespeedFindings,
    ...(playwright.findings || []),
  ];

  const enriched = enrichFindings(allFindings);
  const category_scores = buildCategoryScores(enriched);
  const overall_score = calculateOverallScore(category_scores);
  const growth_opportunity = growthOpportunityLabel(overall_score);
  const roadmap = roadmapBuckets(enriched);

  const critical_count = enriched.filter((f) => f.severity === "critical").length;
  const quick_wins = enriched.filter((f) => f.estimated_effort === "low").length;

  const capabilities = {
    pagespeed,
    playwright: {
      available: Boolean(playwright.available),
      reason: playwright.reason || null,
      rendered: playwright.rendered || null,
    },
    link_check: { checked: linkFindings.length >= 0 },
    contrast: { inline: true },
  };

  return {
    normalized_url: fetchResult.finalUrl,
    website_url: websiteUrl,
    overall_score,
    growth_opportunity,
    category_scores,
    findings: enriched,
    roadmap,
    summary: {
      critical_issues: critical_count,
      improvement_opportunities: enriched.length,
      quick_wins,
      response_time_ms: fetchResult.responseTimeMs,
      http_status: fetchResult.status,
      performance_metrics: pagespeed?.configured && !pagespeed?.error ? {
        performance_score: pagespeed.performance_score,
        lcp_ms: pagespeed.lcp_ms,
        cls: pagespeed.cls,
        inp_ms: pagespeed.inp_ms,
        fcp_ms: pagespeed.fcp_ms,
        ttfb_ms: pagespeed.ttfb_ms,
        strategy: pagespeed.strategy || "mobile",
        source: pagespeed.source || "pagespeed",
      } : null,
    },
    limitations: buildLimitations(capabilities),
    scan_version: SCAN_VERSION,
    capabilities,
  };
}
