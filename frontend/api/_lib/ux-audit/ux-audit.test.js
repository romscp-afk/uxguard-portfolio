import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeAuditUrl } from "./url.js";
import { calculatePriorityScore, calculateOverallScore, buildCategoryScores } from "./scoring.js";
import { parseTargetUrl } from "../testlab/url-safety.js";
import { scanHtml } from "./scan-html.js";

describe("ux-audit url", () => {
  it("normalises bare domains to https", () => {
    const result = normalizeAuditUrl("example.com");
    assert.ok(result.normalized.startsWith("https://"));
    assert.equal(result.hostname, "example.com");
  });

  it("rejects empty url", () => {
    assert.throws(() => normalizeAuditUrl(""), /required/i);
  });

  it("blocks localhost via safety layer", () => {
    assert.throws(() => parseTargetUrl("http://localhost/"), /blocked|localhost/i);
  });
});

describe("ux-audit scoring", () => {
  it("calculates priority with effort divisor", () => {
    const high = calculatePriorityScore({
      severity: "critical",
      confidence: "confirmed",
      business_impact: "high",
      estimated_effort: "low",
    });
    const low = calculatePriorityScore({
      severity: "low",
      confidence: "requires_expert_review",
      business_impact: "low",
      estimated_effort: "high",
    });
    assert.ok(high > low);
  });

  it("builds weighted overall score", () => {
    const categories = buildCategoryScores([]);
    const score = calculateOverallScore(categories);
    assert.ok(score >= 80 && score <= 100);
  });
});

describe("ux-audit scan-html", () => {
  it("flags missing viewport and title", () => {
    const html = "<html><body><p>Hello</p></body></html>";
    const findings = scanHtml({
      html,
      pageUrl: "https://example.com",
      responseTimeMs: 500,
      isHttps: true,
    });
    assert.ok(findings.some((f) => f.title.includes("viewport")));
    assert.ok(findings.some((f) => f.title.includes("title")));
  });
});

describe("ux-audit rate limit", () => {
  it("blocks after max requests per window", async () => {
    const { assertUxAuditRateLimit } = await import("./rate-limit.js");
    const req = { headers: { "x-forwarded-for": "203.0.113.99" } };
    for (let i = 0; i < 8; i++) assertUxAuditRateLimit(req);
    assert.throws(() => assertUxAuditRateLimit(req), /too many/i);
  });
});

describe("ux-audit contrast", () => {
  it("flags low inline contrast", async () => {
    const { contrastRatio } = await import("./scan-contrast.js");
    const { scanInlineContrast } = await import("./scan-contrast.js");
    assert.ok(contrastRatio([0, 0, 0], [255, 255, 255]) > 20);
    const html = '<p style="color:#ccc;background-color:#fff">Hello</p>';
    const findings = scanInlineContrast(html);
    assert.ok(findings.length >= 1);
  });
});

describe("ux-audit pagespeed", () => {
  it("returns mock metrics in test mode", async () => {
    const { fetchPageSpeedMetrics, pageSpeedFindings } = await import("./pagespeed.js");
    const metrics = await fetchPageSpeedMetrics("https://example.com");
    assert.equal(metrics.configured, true);
    assert.ok(metrics.lcp_ms > 0);
    const findings = pageSpeedFindings(metrics);
    assert.ok(findings.length >= 1);
  });
});

describe("ux-audit links", () => {
  it("reports broken internal links in mock mode", async () => {
    const { scanInternalLinks } = await import("./scan-links.js");
    const findings = await scanInternalLinks("<a href='/missing'>x</a>", "https://example.com", { mockBroken: true });
    assert.ok(findings.some((f) => /broken internal/i.test(f.title)));
  });
});

describe("ux-audit html checks v3", () => {
  it("produces structured checks with evidence", async () => {
    const { runHtmlChecks } = await import("./checks/run-html-checks.js");
    const html = "<html><head><title>Test</title></head><body><h1>Hello</h1><button>Book a consultation</button></body></html>";
    const checks = runHtmlChecks({
      html,
      pageUrl: "https://example.com",
      responseTimeMs: 500,
      isHttps: true,
      context: { page_type: "Landing page", primary_goal: "Booking" },
    });
    assert.ok(checks.length > 5);
    assert.ok(checks.every((c) => c.checkId && c.status && Array.isArray(c.evidence)));
    const cta = checks.find((c) => c.checkId === "conversion.cta_presence");
    assert.equal(cta?.status, "passed");
  });
});

describe("ux-audit run-scan pipeline", () => {
  it("returns v3 scoring fields from runAllChecks and scoring", async () => {
    const { runAllChecks } = await import("./checks/run-all-checks.js");
    const { buildCategoryScoresFromChecks, calculateAuditCoverage, calculateOverallScoreFromCategories } =
      await import("./scoring-v3.js");
    const html =
      "<html><head><title>Ex</title><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><h1>Hi</h1><a href='/contact'>Contact us</a></body></html>";
    const scan = await runAllChecks({
      html,
      pageUrl: "https://example.com",
      responseTimeMs: 400,
      isHttps: true,
      context: { page_type: "Company website", primary_goal: "Contact" },
      fetchOptions: { mockBroken: false },
    });
    const categoryScores = buildCategoryScoresFromChecks(scan.checks);
    const overall = calculateOverallScoreFromCategories(categoryScores);
    const coverage = calculateAuditCoverage(scan.checks);
    assert.ok(overall != null);
    assert.ok(coverage >= 0);
    assert.ok(scan.checks.length > 10);
    assert.ok(scan.data_sources.includes("html"));
  });
});

describe("ux-audit api route", () => {
  it("loads the POST route module with correct import paths", async () => {
    const mod = await import("../../v1/ux-audit/index.js");
    assert.equal(typeof mod.default, "function");
  });
});
