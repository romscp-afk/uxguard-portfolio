import { randomUUID } from "node:crypto";
import { getPlanByCode, PLAN_CODES } from "../../plans.js";
import { activatePaidPlan } from "../../persistence.js";

export function mockPaymentsEnabled() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS_IN_PROD !== "true") {
    return false;
  }
  return (
    String(process.env.ENABLE_MOCK_PAYMENTS || "").toLowerCase() === "true" ||
    String(process.env.PAYMENT_PROVIDER || "mock").toLowerCase() === "mock"
  );
}

export function assertMockPaymentsAllowed() {
  if (!mockPaymentsEnabled()) {
    const error = new Error("Mock payments are disabled in this environment.");
    error.status = 403;
    error.code = "mock_disabled";
    throw error;
  }
}

export async function createCheckoutSession({ userId, planCode, billingInterval, origin }) {
  assertMockPaymentsAllowed();
  const plan = getPlanByCode(planCode);
  if (!plan || plan.code === PLAN_CODES.FREE || plan.code === PLAN_CODES.ENTERPRISE) {
    const error = new Error("Select Professional or Team to upgrade.");
    error.status = 400;
    throw error;
  }

  const sessionId = `mock_cs_${randomUUID()}`;
  const amount = billingInterval === "year" ? plan.annual_price : plan.monthly_price;

  return {
    provider: "mock",
    sessionId,
    planCode: plan.code,
    billingInterval,
    amount,
    currency: plan.currency,
    checkoutUrl: `${origin}/checkout/mock?session=${encodeURIComponent(sessionId)}&plan=${plan.code}&interval=${billingInterval}`,
  };
}

export async function completeMockCheckout({ userId, planCode, billingInterval, outcome }) {
  assertMockPaymentsAllowed();

  if (outcome === "failed" || outcome === "cancelled") {
    return {
      success: false,
      outcome,
      detail:
        outcome === "cancelled"
          ? "Checkout was cancelled. Your Free plan is unchanged."
          : "Payment simulation failed. Your Free plan is unchanged.",
    };
  }

  const sub = await activatePaidPlan({
    userId,
    planCode,
    billingInterval,
    paymentProvider: "mock",
    transaction: {
      status: "succeeded",
      provider_transaction_id: `mock_txn_${randomUUID()}`,
    },
  });

  return {
    success: true,
    outcome: "succeeded",
    subscription: sub,
    detail: `Upgraded to ${planCode}.`,
  };
}

export function createCustomerPortalSession({ origin }) {
  assertMockPaymentsAllowed();
  return {
    provider: "mock",
    url: `${origin}/admin/billing`,
  };
}

export function createMockPaymentProvider() {
  return {
    name: "mock",
    createCheckoutSession,
    completeMockCheckout,
    createCustomerPortalSession,
  };
}
