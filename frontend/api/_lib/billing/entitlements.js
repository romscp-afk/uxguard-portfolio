import { getPlanByCode, isUnlimited, formatBytes, PLAN_CODES } from "./plans.js";
import {
  applyDueDowngrades,
  ensureAdminUnlimitedSubscription,
  ensureFreeSubscription,
  ensureUsageCycle,
  getActiveSubscription,
  recountCaseStudies,
} from "./persistence.js";
import { getOrCreateCredits, remainingCredits } from "../ai/persistence.js";
import { DEFAULT_MONTHLY_ALLOWANCE } from "../ai/config.js";
import { updateStore, readStore } from "../store.js";
import { getUserById } from "../demo-data.js";
import { isAdmin } from "../roles.js";

const FEATURE_MAP = {
  custom_domain: "custom_domain_enabled",
  private_projects: "private_projects_enabled",
  advanced_analytics: "advanced_analytics_enabled",
  pdf_export: "pdf_export_enabled",
  team_workspace: "team_workspace_enabled",
  ai_tools: "ai_tools_enabled",
  interview_prep: "interview_prep_enabled",
};

export async function getCurrentPlan(userId) {
  await applyDueDowngrades(userId);
  const user = await getUserById(userId);
  if (user && isAdmin(user)) {
    await ensureAdminUnlimitedSubscription(userId);
    const sub = await getActiveSubscription(userId);
    const plan = getPlanByCode(PLAN_CODES.ADMIN) || getPlanByCode(PLAN_CODES.ENTERPRISE);
    return { subscription: sub, plan, is_admin_comp: true };
  }

  let sub = await getActiveSubscription(userId);
  if (!sub) {
    await ensureFreeSubscription(userId);
    sub = await getActiveSubscription(userId);
  }
  // Never leave a non-admin on the internal admin plan
  if (sub?.plan_code === PLAN_CODES.ADMIN) {
    await updateStore((store) => {
      for (const row of store.subscriptions || []) {
        if (
          Number(row.user_id) === Number(userId) &&
          row.plan_code === PLAN_CODES.ADMIN &&
          (row.status === "active" || row.status === "canceling")
        ) {
          row.status = "ended";
          row.updated_at = new Date().toISOString();
        }
      }
      return store;
    });
    await ensureFreeSubscription(userId);
    sub = await getActiveSubscription(userId);
  }
  const plan = getPlanByCode(sub?.plan_code || PLAN_CODES.FREE) || getPlanByCode(PLAN_CODES.FREE);
  return { subscription: sub, plan, is_admin_comp: false };
}

export async function syncCaseStudyUsage(userId) {
  const store = await readStore();
  const count = (store.caseStudies || []).filter(
    (cs) => Number(cs.author_id) === Number(userId),
  ).length;
  await recountCaseStudies(userId, count);
  return count;
}

/** Force AI credit allowance to match the user's active plan (source of truth). */
export async function syncAiCreditsWithPlan(userId) {
  const { plan } = await getCurrentPlan(userId);
  const usage = await ensureUsageCycle(userId);
  const planCredits = isUnlimited(plan.ai_credits)
    ? null
    : Number(plan.ai_credits ?? DEFAULT_MONTHLY_ALLOWANCE);
  // Metering needs a finite number; unlimited plans store a high sentinel for remaining checks.
  const storedAllowance = planCredits == null ? 1_000_000 : planCredits;

  await updateStore((store) => {
    store.user_ai_credits = store.user_ai_credits || [];
    let row = store.user_ai_credits.find((c) => Number(c.user_id) === Number(userId));
    const resetDate =
      String(usage.cycle_end || "").slice(0, 7) || new Date().toISOString().slice(0, 7);
    if (!row) {
      row = {
        user_id: Number(userId),
        monthly_allowance: storedAllowance,
        purchased_credits: 0,
        used_credits: Number(usage.ai_credits_used || 0),
        reset_date: resetDate,
      };
      store.user_ai_credits.push(row);
    } else {
      row.monthly_allowance = storedAllowance;
      row.used_credits = Math.max(Number(row.used_credits || 0), Number(usage.ai_credits_used || 0));
    }
    return store;
  });

  return { plan, allowance: planCredits, storedAllowance };
}

export async function getUsageSummary(userId) {
  const { subscription, plan, is_admin_comp } = await getCurrentPlan(userId);
  await syncCaseStudyUsage(userId);
  const usage = await ensureUsageCycle(userId);
  await syncAiCreditsWithPlan(userId);

  const credits = await getOrCreateCredits(userId);
  const aiUsed = Number(credits.used_credits || 0);
  const planCredits = isUnlimited(plan.ai_credits) ? null : Number(plan.ai_credits || 0);
  const aiAllowance = planCredits;
  const aiRemaining = planCredits == null ? null : remainingCredits({
    ...credits,
    monthly_allowance: planCredits,
  });

  return {
    plan: {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      currency: plan.currency,
    },
    subscription: {
      id: subscription?.id,
      status: subscription?.status || "active",
      billing_interval: subscription?.billing_interval || "month",
      current_period_start: subscription?.current_period_start,
      current_period_end: subscription?.current_period_end,
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
      payment_provider: subscription?.payment_provider || "system",
    },
    usage: {
      portfolios_used: usage.portfolios_used || 1,
      portfolios_limit: plan.portfolio_limit,
      case_studies_used: usage.case_studies_used || 0,
      case_studies_limit: plan.case_study_limit,
      storage_used_bytes: usage.storage_used_bytes || 0,
      storage_limit_bytes: plan.storage_limit_bytes,
      storage_used_label: formatBytes(usage.storage_used_bytes || 0),
      storage_limit_label: formatBytes(plan.storage_limit_bytes),
      ai_credits_used: aiUsed,
      ai_credits_limit: aiAllowance,
      ai_credits_remaining: aiRemaining,
      cycle_start: usage.cycle_start,
      cycle_end: usage.cycle_end,
    },
    features: {
      custom_domain: plan.custom_domain_enabled,
      private_projects: plan.private_projects_enabled,
      advanced_analytics: plan.advanced_analytics_enabled,
      pdf_export: plan.pdf_export_enabled,
      team_workspace: plan.team_workspace_enabled,
      ai_tools: plan.ai_tools_enabled,
      interview_prep: plan.interview_prep_enabled,
    },
    is_admin_comp: Boolean(is_admin_comp),
    unlimited: isUnlimited(plan.case_study_limit) && isUnlimited(plan.ai_credits),
  };
}

export async function checkEntitlement(userId, feature) {
  const { plan } = await getCurrentPlan(userId);
  const key = FEATURE_MAP[feature] || feature;
  const allowed = Boolean(plan[key]);
  return {
    allowed,
    feature,
    plan: plan.code,
    reason: allowed
      ? null
      : `Your ${plan.name} plan does not include this feature. Upgrade to unlock it.`,
    upgrade_required: !allowed,
  };
}

export async function checkUsageLimit(userId, resource) {
  const summary = await getUsageSummary(userId);
  const { usage, plan } = {
    usage: summary.usage,
    plan: summary.plan,
  };
  const full = await getCurrentPlan(userId);
  const planDef = full.plan;

  if (resource === "case_study") {
    const limit = planDef.case_study_limit;
    if (isUnlimited(limit)) return { allowed: true, resource, used: usage.case_studies_used, limit: null };
    const allowed = usage.case_studies_used < limit;
    return {
      allowed,
      resource,
      used: usage.case_studies_used,
      limit,
      reason: allowed
        ? null
        : `You have reached the ${plan.name} plan limit of ${limit} case studies. Upgrade to Professional for unlimited case studies.`,
      upgrade_required: !allowed,
      reset_date: null,
    };
  }

  if (resource === "portfolio") {
    const limit = planDef.portfolio_limit;
    if (isUnlimited(limit)) return { allowed: true, resource, used: usage.portfolios_used, limit: null };
    const allowed = usage.portfolios_used < limit;
    return {
      allowed,
      resource,
      used: usage.portfolios_used,
      limit,
      reason: allowed
        ? null
        : `You have reached the Free plan limit of ${limit} portfolio. Upgrade to create more.`,
      upgrade_required: !allowed,
    };
  }

  if (resource === "ai_credits") {
    const limit = planDef.ai_credits;
    if (isUnlimited(limit)) return { allowed: true, resource, used: usage.ai_credits_used, limit: null };
    const remaining = usage.ai_credits_remaining ?? 0;
    return {
      allowed: remaining > 0,
      resource,
      used: usage.ai_credits_used,
      limit: usage.ai_credits_limit,
      remaining,
      reason:
        remaining > 0
          ? null
          : `You have used all ${usage.ai_credits_limit} AI credits for this month. Credits reset on ${new Date(usage.cycle_end).toLocaleDateString()}, or upgrade for more.`,
      upgrade_required: remaining <= 0,
      reset_date: usage.cycle_end,
    };
  }

  if (resource === "storage") {
    const limit = planDef.storage_limit_bytes;
    if (isUnlimited(limit)) return { allowed: true, resource, used: usage.storage_used_bytes, limit: null };
    const allowed = usage.storage_used_bytes < limit;
    return {
      allowed,
      resource,
      used: usage.storage_used_bytes,
      limit,
      reason: allowed
        ? null
        : `You have reached your storage limit (${formatBytes(limit)}). Remove unused files or upgrade your plan.`,
      upgrade_required: !allowed,
    };
  }

  if (resource === "team_member") {
    const limit = planDef.team_member_limit;
    if (isUnlimited(limit)) return { allowed: true, resource, limit: null };
    return {
      allowed: false,
      resource,
      limit,
      reason: "Team seats require the Team plan.",
      upgrade_required: true,
    };
  }

  return { allowed: false, resource, reason: "Unknown resource.", upgrade_required: false };
}

export async function assertCanCreateCaseStudy(userId) {
  const check = await checkUsageLimit(userId, "case_study");
  if (!check.allowed) {
    const error = new Error(check.reason || "Case study limit reached.");
    error.status = 403;
    error.code = "limit_reached";
    error.limit = check;
    throw error;
  }
}

export async function assertAiCredits(userId, amount) {
  const { plan, allowance } = await syncAiCreditsWithPlan(userId);
  if (!plan.ai_tools_enabled) {
    const error = new Error("AI tools are not included in your plan.");
    error.status = 403;
    error.code = "feature_locked";
    throw error;
  }
  const refreshed = await getOrCreateCredits(userId);
  const planCredits = allowance == null ? 1_000_000 : allowance;
  if (remainingCredits({ ...refreshed, monthly_allowance: planCredits }) < amount) {
    const usage = await ensureUsageCycle(userId);
    const error = new Error(
      `You have used all ${planCredits} AI credits for this month. Your credits will reset on ${new Date(usage.cycle_end).toLocaleDateString()}, or you can upgrade for additional monthly credits.`,
    );
    error.status = 402;
    error.code = "insufficient_credits";
    error.upgrade_required = true;
    error.remainingCredits = remainingCredits({ ...refreshed, monthly_allowance: planCredits });
    error.reset_date = usage.cycle_end;
    throw error;
  }
}

/**
 * Adjust usage counters after a successful action (or restore on rollback).
 * Storage is cumulative and never reset by cycle rollover.
 */
export async function consumeUsage(userId, resource, amount = 1) {
  const delta = Math.max(0, Number(amount) || 0);
  if (!delta) return ensureUsageCycle(userId);

  await ensureUsageCycle(userId);
  await updateStore((store) => {
    const id = Number(userId);
    const row = (store.user_usage || [])
      .filter((u) => Number(u.user_id) === id)
      .sort((a, b) => new Date(b.cycle_start) - new Date(a.cycle_start))[0];
    if (!row) return store;
    if (resource === "case_study") row.case_studies_used = Number(row.case_studies_used || 0) + delta;
    if (resource === "portfolio") row.portfolios_used = Number(row.portfolios_used || 0) + delta;
    if (resource === "storage") row.storage_used_bytes = Number(row.storage_used_bytes || 0) + delta;
    if (resource === "ai_credits") row.ai_credits_used = Number(row.ai_credits_used || 0) + delta;
    row.updated_at = new Date().toISOString();
    return store;
  });
  return ensureUsageCycle(userId);
}

export async function restoreUsage(userId, resource, amount = 1) {
  const delta = Math.max(0, Number(amount) || 0);
  if (!delta) return ensureUsageCycle(userId);

  await ensureUsageCycle(userId);
  await updateStore((store) => {
    const id = Number(userId);
    const row = (store.user_usage || [])
      .filter((u) => Number(u.user_id) === id)
      .sort((a, b) => new Date(b.cycle_start) - new Date(a.cycle_start))[0];
    if (!row) return store;
    if (resource === "case_study") {
      row.case_studies_used = Math.max(0, Number(row.case_studies_used || 0) - delta);
    }
    if (resource === "portfolio") {
      row.portfolios_used = Math.max(0, Number(row.portfolios_used || 0) - delta);
    }
    if (resource === "storage") {
      row.storage_used_bytes = Math.max(0, Number(row.storage_used_bytes || 0) - delta);
    }
    if (resource === "ai_credits") {
      row.ai_credits_used = Math.max(0, Number(row.ai_credits_used || 0) - delta);
    }
    row.updated_at = new Date().toISOString();
    return store;
  });
  return ensureUsageCycle(userId);
}
