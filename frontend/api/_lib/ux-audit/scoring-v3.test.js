import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCategoryScoresFromChecks,
  calculateAuditCoverage,
  calculateOverallScoreFromCategories,
  calculatePriorityScoreV3,
  checksToFindings,
  growthOpportunityFromChecks,
  identifyQuickWins,
  scoreInterpretation,
} from "./scoring-v3.js";
import { failedCheck, notApplicableCheck, notTestedCheck, passedCheck, warningCheck } from "./check-result.js";
import { requiresSiteSearch } from "./audit-context.js";

function sampleCheck(overrides) {
  return passedCheck({
    checkId: "test.check",
    category: "usability_navigation",
    metric: "Test check",
    maxScore: 10,
    evidence: ["ok"],
    affectedElements: ["body"],
    explanation: "ok",
    recommendation: "ok",
    expectedUxOutcome: "ok",
    potentialBusinessImpact: "ok",
    ...overrides,
  });
}

describe("scoring-v3 category score", () => {
  it("excludes not_applicable and not_tested from denominator", () => {
    const checks = [
      passedCheck({
        checkId: "a",
        category: "performance",
        metric: "A",
        maxScore: 10,
        evidence: ["pass"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
      notTestedCheck({
        checkId: "b",
        category: "performance",
        metric: "B",
        maxScore: 10,
        evidence: ["unavailable"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
      notApplicableCheck({
        checkId: "c",
        category: "performance",
        metric: "C",
        maxScore: 10,
        evidence: ["n/a"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
    ];
    const rows = buildCategoryScoresFromChecks(checks);
    const perf = rows.find((r) => r.category === "performance");
    assert.equal(perf.score, 100);
    assert.equal(perf.checks_completed, 1);
  });

  it("does not penalise unavailable checks as zero", () => {
    const checks = [
      notTestedCheck({
        checkId: "only",
        category: "mobile_experience",
        metric: "Rendered",
        maxScore: 10,
        evidence: ["disabled"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
    ];
    const rows = buildCategoryScoresFromChecks(checks);
    const mobile = rows.find((r) => r.category === "mobile_experience");
    assert.equal(mobile.score, null);
  });
});

describe("scoring-v3 overall score", () => {
  it("redistributes weight across tested categories", () => {
    const rows = [
      { category: "conversion_experience", score: 80, weight: 0.25 },
      { category: "usability_navigation", score: null, weight: 0.2 },
      { category: "accessibility", score: 60, weight: 0.15 },
      { category: "mobile_experience", score: null, weight: 0.15 },
      { category: "content_trust", score: 70, weight: 0.15 },
      { category: "performance", score: 50, weight: 0.1 },
    ];
    const overall = calculateOverallScoreFromCategories(rows);
    assert.ok(overall >= 60 && overall <= 75);
  });
});

describe("scoring-v3 audit coverage", () => {
  it("counts completed automated check weights", () => {
    const checks = [
      sampleCheck({ checkId: "1", maxScore: 10 }),
      notTestedCheck({
        checkId: "2",
        category: "usability_navigation",
        metric: "Unavailable",
        maxScore: 10,
        evidence: ["x"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
    ];
    const coverage = calculateAuditCoverage(checks);
    assert.equal(coverage, 50);
  });
});

describe("scoring-v3 priority", () => {
  it("ranks critical high-confidence findings above low-confidence", () => {
    const high = calculatePriorityScoreV3(
      failedCheck({
        checkId: "a",
        category: "conversion_experience",
        metric: "CTA",
        maxScore: 10,
        severity: "critical",
        confidence: "high",
        businessImpact: "high",
        estimatedEffort: "low",
        evidence: ["x"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
    );
    const low = calculatePriorityScoreV3(
      warningCheck({
        checkId: "b",
        category: "conversion_experience",
        metric: "CTA",
        maxScore: 10,
        severity: "critical",
        confidence: "low",
        businessImpact: "high",
        estimatedEffort: "low",
        evidence: ["x"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
    );
    assert.ok(high > low);
  });
});

describe("scoring-v3 findings", () => {
  it("blocks low-confidence critical findings", () => {
    const findings = checksToFindings([
      failedCheck({
        checkId: "a",
        category: "content_trust",
        metric: "Claim",
        maxScore: 8,
        severity: "critical",
        confidence: "low",
        evidence: ["keyword only"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
    ]);
    assert.equal(findings.length, 0);
  });
});

describe("scoring-v3 quick wins", () => {
  it("prefers low effort with medium+ business impact", () => {
    const findings = checksToFindings([
      warningCheck({
        checkId: "a",
        category: "accessibility",
        metric: "Title",
        maxScore: 6,
        severity: "medium",
        confidence: "high",
        estimatedEffort: "low",
        businessImpact: "medium",
        evidence: ["missing title"],
        affectedElements: ["title"],
        explanation: "x",
        recommendation: "Add title",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
    ]);
    const wins = identifyQuickWins(findings);
    assert.equal(wins.length, 1);
  });
});

describe("scoring-v3 interpretation", () => {
  it("maps score bands", () => {
    assert.equal(scoreInterpretation(92), "Excellent");
    assert.equal(scoreInterpretation(84), "Good");
    assert.equal(scoreInterpretation(74), "Fair");
    assert.equal(scoreInterpretation(55), "Weak");
    assert.equal(scoreInterpretation(30), "Critical");
  });
});

describe("audit-context applicability", () => {
  it("does not require search on landing pages", () => {
    assert.equal(requiresSiteSearch({ page_type: "Landing page" }), false);
    assert.equal(requiresSiteSearch({ page_type: "Content / publication" }), true);
  });
});

describe("scoring-v3 growth opportunity", () => {
  it("returns higher opportunity for weak conversion scores", () => {
    const checks = [];
    const categories = buildCategoryScoresFromChecks([
      failedCheck({
        checkId: "c",
        category: "conversion_experience",
        metric: "CTA",
        maxScore: 10,
        severity: "high",
        confidence: "high",
        evidence: ["none"],
        affectedElements: [],
        explanation: "x",
        recommendation: "x",
        expectedUxOutcome: "x",
        potentialBusinessImpact: "x",
      }),
    ]);
    const label = growthOpportunityFromChecks(checks, categories, 45);
    assert.ok(["High", "Very high"].includes(label));
  });
});
