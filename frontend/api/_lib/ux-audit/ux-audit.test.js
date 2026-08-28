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
