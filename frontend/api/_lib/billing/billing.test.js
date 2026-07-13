/**
 * Billing unit tests (Node built-in test runner).
 * Run: UXGUARD_TEST=1 npm test
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

process.env.UXGUARD_TEST = "1";
process.env.BLOB_READ_WRITE_TOKEN = "";
process.env.PAYMENT_PROVIDER = "mock";
process.env.ENABLE_MOCK_PAYMENTS = "true";
process.env.NODE_ENV = "test";

const { resetMemoryStoreForTests } = await import("../store.js");
const { PLAN_CODES, getPlanByCode, isUnlimited } = await import("./plans.js");
const {
  ensureFreeSubscription,
  activatePaidPlan,
  scheduleCancellation,
  getActiveSubscription,
} = await import("./persistence.js");
const {
  checkUsageLimit,
  assertCanCreateCaseStudy,
  getUsageSummary,
} = await import("./entitlements.js");
const {
  mockPaymentsEnabled,
  assertMockPaymentsAllowed,
  completeMockCheckout,
} = await import("./payments/providers/mock-payment-provider.js");
const { updateStore } = await import("../store.js");

beforeEach(() => {
  resetMemoryStoreForTests();
  process.env.NODE_ENV = "test";
  process.env.ENABLE_MOCK_PAYMENTS = "true";
  process.env.PAYMENT_PROVIDER = "mock";
  delete process.env.ALLOW_MOCK_PAYMENTS_IN_PROD;
});

afterEach(() => {
  process.env.NODE_ENV = "test";
});

describe("plan configuration", () => {
  it("defines Free limits with null = unlimited on paid plans", () => {
    const free = getPlanByCode(PLAN_CODES.FREE);
    assert.equal(free.case_study_limit, 2);
    assert.equal(free.portfolio_limit, 1);
    assert.equal(free.ai_credits, 10);
    assert.equal(free.storage_limit_bytes, 500 * 1024 * 1024);

    const pro = getPlanByCode(PLAN_CODES.PROFESSIONAL);
    assert.equal(isUnlimited(pro.case_study_limit), true);
    assert.equal(isUnlimited(pro.portfolio_limit), true);
    assert.equal(pro.ai_credits, 200);
  });
});

describe("free plan activation", () => {
  it("assigns Free on first ensureFreeSubscription", async () => {
    const sub = await ensureFreeSubscription(99);
    assert.equal(sub.plan_code, PLAN_CODES.FREE);
    assert.equal(sub.status, "active");
    assert.equal(sub.alreadyExisted, false);

    const summary = await getUsageSummary(99);
    assert.equal(summary.plan.code, "free");
    assert.equal(summary.usage.ai_credits_limit, 10);
    assert.equal(summary.usage.case_studies_limit, 2);
    assert.equal(summary.usage.portfolios_limit, 1);
  });

  it("prevents duplicate Free subscriptions", async () => {
    await ensureFreeSubscription(42);
    await ensureFreeSubscription(42);
    const store = await (await import("../store.js")).readStore();
    const frees = store.subscriptions.filter(
      (s) => s.user_id === 42 && s.plan_code === "free" && (s.status === "active" || s.status === "canceling"),
    );
    assert.equal(frees.length, 1);
  });

  it("does not create Free when a paid plan is active", async () => {
    await ensureFreeSubscription(7);
    await activatePaidPlan({
      userId: 7,
      planCode: PLAN_CODES.PROFESSIONAL,
      billingInterval: "month",
      paymentProvider: "mock",
      transaction: { status: "succeeded" },
    });
    const again = await ensureFreeSubscription(7);
    assert.equal(again.plan_code, PLAN_CODES.PROFESSIONAL);
    const active = await getActiveSubscription(7);
    assert.equal(active.plan_code, PLAN_CODES.PROFESSIONAL);
  });
});

describe("usage limits", () => {
  it("allows Free user within case study limit and blocks after", async () => {
    await ensureFreeSubscription(11);
    await updateStore((store) => {
      store.caseStudies = [
        { id: 1001, author_id: 11, title: "A", status: "draft" },
        { id: 1002, author_id: 11, title: "B", status: "draft" },
      ];
      return store;
    });

    const blocked = await checkUsageLimit(11, "case_study");
    assert.equal(blocked.allowed, false);
    await assert.rejects(() => assertCanCreateCaseStudy(11), /limit/i);
  });

  it("allows Professional unlimited case studies", async () => {
    await ensureFreeSubscription(12);
    await activatePaidPlan({
      userId: 12,
      planCode: PLAN_CODES.PROFESSIONAL,
      billingInterval: "month",
      paymentProvider: "mock",
      transaction: { status: "succeeded" },
    });
    await updateStore((store) => {
      store.caseStudies = Array.from({ length: 5 }, (_, i) => ({
        id: 2000 + i,
        author_id: 12,
        title: `CS ${i}`,
        status: "draft",
      }));
      return store;
    });
    const check = await checkUsageLimit(12, "case_study");
    assert.equal(check.allowed, true);
    assert.equal(check.limit, null);
  });
});

describe("mock payments", () => {
  it("activates paid plan on mock success", async () => {
    await ensureFreeSubscription(21);
    const result = await completeMockCheckout({
      userId: 21,
      planCode: PLAN_CODES.PROFESSIONAL,
      billingInterval: "month",
      outcome: "succeeded",
    });
    assert.equal(result.success, true);
    const active = await getActiveSubscription(21);
    assert.equal(active.plan_code, PLAN_CODES.PROFESSIONAL);
  });

  it("does not activate paid plan on mock failure", async () => {
    await ensureFreeSubscription(22);
    const result = await completeMockCheckout({
      userId: 22,
      planCode: PLAN_CODES.PROFESSIONAL,
      billingInterval: "month",
      outcome: "failed",
    });
    assert.equal(result.success, false);
    const active = await getActiveSubscription(22);
    assert.equal(active.plan_code, PLAN_CODES.FREE);
  });

  it("blocks mock payments in production without override", () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_MOCK_PAYMENTS = "true";
    assert.equal(mockPaymentsEnabled(), false);
    assert.throws(() => assertMockPaymentsAllowed(), /disabled/i);
  });

  it("allows mock payments in production with secure override", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_MOCK_PAYMENTS_IN_PROD = "true";
    process.env.ENABLE_MOCK_PAYMENTS = "true";
    assert.equal(mockPaymentsEnabled(), true);
  });
});

describe("AI credits follow plan", () => {
  it("syncs Free plan users to 10 monthly credits even if ledger had 100", async () => {
    await ensureFreeSubscription(55);
    await updateStore((store) => {
      store.user_ai_credits = store.user_ai_credits || [];
      const existing = store.user_ai_credits.find((c) => Number(c.user_id) === 55);
      if (existing) {
        existing.monthly_allowance = 100;
      } else {
        store.user_ai_credits.push({
          user_id: 55,
          monthly_allowance: 100,
          purchased_credits: 0,
          used_credits: 0,
          reset_date: "2026-07",
        });
      }
      return store;
    });
    const { syncAiCreditsWithPlan } = await import("./entitlements.js");
    const synced = await syncAiCreditsWithPlan(55);
    assert.equal(synced.allowance, 10);
    const store = await (await import("../store.js")).readStore();
    const row = store.user_ai_credits.find((c) => Number(c.user_id) === 55);
    assert.equal(row.monthly_allowance, 10);
  });

  it("syncs Professional plan users to 200 monthly credits", async () => {
    await ensureFreeSubscription(56);
    await activatePaidPlan({
      userId: 56,
      planCode: PLAN_CODES.PROFESSIONAL,
      billingInterval: "month",
      paymentProvider: "mock",
      transaction: { status: "succeeded" },
    });
    const { syncAiCreditsWithPlan } = await import("./entitlements.js");
    const synced = await syncAiCreditsWithPlan(56);
    assert.equal(synced.allowance, 200);
  });
});

describe("admin unlimited", () => {
  it("grants Admin plan with unlimited case studies", async () => {
    await updateStore((store) => {
      store.users.push({
        id: 77,
        email: "admin-test@uxguard.io",
        password: "x",
        username: "admin-test",
        name: "Admin Test",
        role: "admin",
      });
      return store;
    });
    const { ensureAdminUnlimitedSubscription } = await import("./persistence.js");
    await ensureAdminUnlimitedSubscription(77);
    const { getCurrentPlan, checkUsageLimit } = await import("./entitlements.js");
    const { plan } = await getCurrentPlan(77);
    assert.equal(plan.code, PLAN_CODES.ADMIN);
    assert.equal(plan.case_study_limit, null);
    assert.equal(plan.ai_credits, null);
    await updateStore((store) => {
      store.caseStudies = Array.from({ length: 5 }, (_, i) => ({
        id: 3000 + i,
        author_id: 77,
        title: `A ${i}`,
        status: "draft",
      }));
      return store;
    });
    const check = await checkUsageLimit(77, "case_study");
    assert.equal(check.allowed, true);
  });
});

describe("cancellation", () => {
  it("keeps paid access until period end (canceling status)", async () => {
    await ensureFreeSubscription(31);
    await activatePaidPlan({
      userId: 31,
      planCode: PLAN_CODES.TEAM,
      billingInterval: "month",
      paymentProvider: "mock",
      transaction: { status: "succeeded" },
    });
    const cancelled = await scheduleCancellation(31);
    assert.equal(cancelled.status, "canceling");
    assert.equal(cancelled.cancel_at_period_end, true);
    const active = await getActiveSubscription(31);
    assert.equal(active.plan_code, PLAN_CODES.TEAM);
  });
});
