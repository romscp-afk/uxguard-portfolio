import { randomUUID } from "node:crypto";
import { readStore, updateStore } from "../store.js";
import { PLAN_CODES, getPlanByCode, isUnlimited } from "./plans.js";

function nowIso() {
  return new Date().toISOString();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

export function ensureBillingCollections(store) {
  store.subscriptions = store.subscriptions || [];
  store.user_usage = store.user_usage || [];
  store.payment_transactions = store.payment_transactions || [];
  store.subscription_events = store.subscription_events || [];
  return store;
}

export async function getActiveSubscription(userId) {
  const store = ensureBillingCollections(await readStore());
  const list = store.subscriptions
    .filter((s) => Number(s.user_id) === Number(userId))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  const active = list.find((s) => s.status === "active" || s.status === "canceling");
  return active || list[0] || null;
}

export async function ensureFreeSubscription(userId) {
  let created = null;
  await updateStore((store) => {
    ensureBillingCollections(store);
    const id = Number(userId);
    const activeRows = store.subscriptions.filter(
      (s) => Number(s.user_id) === id && (s.status === "active" || s.status === "canceling"),
    );
    const paidActive = activeRows.find((s) => s.plan_code !== PLAN_CODES.FREE);
    if (paidActive) {
      created = { ...paidActive, alreadyExisted: true };
      return store;
    }
    const existingFree = activeRows.find((s) => s.plan_code === PLAN_CODES.FREE);
    if (existingFree) {
      created = { ...existingFree, alreadyExisted: true };
      return store;
    }

    const start = nowIso();
    const end = addMonths(start, 1);
    const sub = {
      id: randomUUID(),
      user_id: id,
      plan_id: PLAN_CODES.FREE,
      plan_code: PLAN_CODES.FREE,
      status: "active",
      billing_interval: "month",
      current_period_start: start,
      current_period_end: end,
      cancel_at_period_end: false,
      payment_provider: "system",
      provider_customer_id: null,
      provider_subscription_id: null,
      trial_start: null,
      trial_end: null,
      created_at: start,
      updated_at: start,
    };
    store.subscriptions.push(sub);
    store.subscription_events.push({
      id: randomUUID(),
      user_id: id,
      subscription_id: sub.id,
      event_type: "free_activated",
      old_plan_id: null,
      new_plan_id: PLAN_CODES.FREE,
      metadata: { source: "auto_provision" },
      created_at: start,
    });
    created = { ...sub, alreadyExisted: false };
    return store;
  });

  await ensureUsageCycle(userId);
  return created;
}

export async function ensureUsageCycle(userId) {
  let usage = null;
  const subscription = await getActiveSubscription(userId);
  const plan = getPlanByCode(subscription?.plan_code || PLAN_CODES.FREE) || getPlanByCode(PLAN_CODES.FREE);

  await updateStore((store) => {
    ensureBillingCollections(store);
    const id = Number(userId);
    const now = new Date();
    let row = store.user_usage
      .filter((u) => Number(u.user_id) === id)
      .sort((a, b) => new Date(b.cycle_start) - new Date(a.cycle_start))[0];

    const periodStart = subscription?.current_period_start || nowIso();
    const periodEnd = subscription?.current_period_end || addMonths(periodStart, 1);

    if (!row) {
      row = {
        id: randomUUID(),
        user_id: id,
        cycle_start: periodStart,
        cycle_end: periodEnd,
        portfolios_used: 1,
        case_studies_used: 0,
        storage_used_bytes: 0,
        ai_credits_used: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      store.user_usage.push(row);
    } else if (new Date(row.cycle_end) <= now) {
      // Lazy monthly reset — AI credits usage resets; storage does not.
      row = {
        id: randomUUID(),
        user_id: id,
        cycle_start: periodStart,
        cycle_end: periodEnd,
        portfolios_used: row.portfolios_used,
        case_studies_used: row.case_studies_used,
        storage_used_bytes: row.storage_used_bytes,
        ai_credits_used: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      store.user_usage.push(row);
    } else {
      // Keep cycle dates aligned with subscription when possible
      if (subscription) {
        row.cycle_start = subscription.current_period_start;
        row.cycle_end = subscription.current_period_end;
      }
    }

    usage = { ...row, plan_code: plan.code, plan };
    return store;
  });

  return usage;
}

export async function recountCaseStudies(userId, count) {
  await ensureUsageCycle(userId);
  await updateStore((store) => {
    ensureBillingCollections(store);
    const id = Number(userId);
    const row = store.user_usage
      .filter((u) => Number(u.user_id) === id)
      .sort((a, b) => new Date(b.cycle_start) - new Date(a.cycle_start))[0];
    if (row) {
      row.case_studies_used = Math.max(0, Number(count) || 0);
      row.updated_at = nowIso();
    }
    return store;
  });
}

export async function setAiCreditsUsed(userId, used) {
  await ensureUsageCycle(userId);
  await updateStore((store) => {
    ensureBillingCollections(store);
    const id = Number(userId);
    const row = store.user_usage
      .filter((u) => Number(u.user_id) === id)
      .sort((a, b) => new Date(b.cycle_start) - new Date(a.cycle_start))[0];
    if (row) {
      row.ai_credits_used = Math.max(0, Number(used) || 0);
      row.updated_at = nowIso();
    }
    return store;
  });
}

export async function activatePaidPlan({
  userId,
  planCode,
  billingInterval = "month",
  paymentProvider = "mock",
  providerCustomerId = null,
  providerSubscriptionId = null,
  transaction = null,
}) {
  const plan = getPlanByCode(planCode);
  if (!plan || plan.code === PLAN_CODES.FREE || plan.code === PLAN_CODES.ENTERPRISE) {
    const error = new Error("Invalid paid plan.");
    error.status = 400;
    throw error;
  }

  let result = null;
  const start = nowIso();
  const end = billingInterval === "year" ? addMonths(start, 12) : addMonths(start, 1);

  await updateStore((store) => {
    ensureBillingCollections(store);
    const id = Number(userId);

    for (const sub of store.subscriptions) {
      if (Number(sub.user_id) === id && (sub.status === "active" || sub.status === "canceling")) {
        sub.status = "replaced";
        sub.updated_at = start;
      }
    }

    const sub = {
      id: randomUUID(),
      user_id: id,
      plan_id: plan.code,
      plan_code: plan.code,
      status: "active",
      billing_interval: billingInterval,
      current_period_start: start,
      current_period_end: end,
      cancel_at_period_end: false,
      payment_provider: paymentProvider,
      provider_customer_id: providerCustomerId,
      provider_subscription_id: providerSubscriptionId || randomUUID(),
      trial_start: null,
      trial_end: null,
      created_at: start,
      updated_at: start,
    };
    store.subscriptions.push(sub);

    store.subscription_events.push({
      id: randomUUID(),
      user_id: id,
      subscription_id: sub.id,
      event_type: "subscription_activated",
      old_plan_id: PLAN_CODES.FREE,
      new_plan_id: plan.code,
      metadata: { billingInterval, paymentProvider },
      created_at: start,
    });

    if (transaction) {
      store.payment_transactions.push({
        id: randomUUID(),
        user_id: id,
        subscription_id: sub.id,
        payment_provider: paymentProvider,
        provider_transaction_id: transaction.provider_transaction_id || randomUUID(),
        amount: transaction.amount ?? (billingInterval === "year" ? plan.annual_price : plan.monthly_price),
        currency: plan.currency,
        status: transaction.status || "succeeded",
        transaction_type: "subscription",
        invoice_url: transaction.invoice_url || null,
        receipt_url: transaction.receipt_url || null,
        created_at: start,
      });
    }

    // Reset AI usage cycle for new billing period
    store.user_usage.push({
      id: randomUUID(),
      user_id: id,
      cycle_start: start,
      cycle_end: end,
      portfolios_used: 1,
      case_studies_used: 0,
      storage_used_bytes: 0,
      ai_credits_used: 0,
      created_at: start,
      updated_at: start,
    });

    result = sub;
    return store;
  });

  return result;
}

export async function scheduleCancellation(userId) {
  let updated = null;
  await updateStore((store) => {
    ensureBillingCollections(store);
    const id = Number(userId);
    const sub = store.subscriptions
      .filter((s) => Number(s.user_id) === id && (s.status === "active" || s.status === "canceling"))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    if (!sub) {
      const error = new Error("No active subscription found.");
      error.status = 404;
      throw error;
    }
    if (sub.plan_code === PLAN_CODES.FREE) {
      const error = new Error("Free plan cannot be cancelled.");
      error.status = 400;
      throw error;
    }
    sub.cancel_at_period_end = true;
    sub.status = "canceling";
    sub.updated_at = nowIso();
    store.subscription_events.push({
      id: randomUUID(),
      user_id: id,
      subscription_id: sub.id,
      event_type: "cancel_at_period_end",
      old_plan_id: sub.plan_code,
      new_plan_id: PLAN_CODES.FREE,
      metadata: { access_until: sub.current_period_end },
      created_at: nowIso(),
    });
    updated = { ...sub };
    return store;
  });
  return updated;
}

export async function resumeSubscription(userId) {
  let updated = null;
  await updateStore((store) => {
    ensureBillingCollections(store);
    const id = Number(userId);
    const sub = store.subscriptions
      .filter((s) => Number(s.user_id) === id && s.status === "canceling")
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    if (!sub) {
      const error = new Error("No cancelling subscription to resume.");
      error.status = 404;
      throw error;
    }
    sub.cancel_at_period_end = false;
    sub.status = "active";
    sub.updated_at = nowIso();
    store.subscription_events.push({
      id: randomUUID(),
      user_id: id,
      subscription_id: sub.id,
      event_type: "subscription_resumed",
      old_plan_id: sub.plan_code,
      new_plan_id: sub.plan_code,
      metadata: {},
      created_at: nowIso(),
    });
    updated = { ...sub };
    return store;
  });
  return updated;
}

export async function applyDueDowngrades(userId) {
  const sub = await getActiveSubscription(userId);
  if (!sub || sub.status !== "canceling") return null;
  if (new Date(sub.current_period_end) > new Date()) return null;

  await updateStore((store) => {
    ensureBillingCollections(store);
    const row = store.subscriptions.find((s) => s.id === sub.id);
    if (row) {
      row.status = "ended";
      row.updated_at = nowIso();
    }
    return store;
  });
  return ensureFreeSubscription(userId);
}

export async function listTransactions(userId) {
  const store = ensureBillingCollections(await readStore());
  return store.payment_transactions
    .filter((t) => Number(t.user_id) === Number(userId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function listSubscriptionEvents(userId) {
  const store = ensureBillingCollections(await readStore());
  return store.subscription_events
    .filter((e) => Number(e.user_id) === Number(userId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export { addMonths, addDays, isUnlimited };
