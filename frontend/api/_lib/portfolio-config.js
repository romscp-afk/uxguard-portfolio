import { readStore, updateStore } from "./store.js";
import { defaultPortfolioConfig } from "./roles.js";

export function getUserPortfolioConfig(user) {
  return {
    ...defaultPortfolioConfig(),
    ...(user.portfolio_config || {}),
  };
}

export async function getPortfolioConfigForUser(userId) {
  const store = await readStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) return null;
  return getUserPortfolioConfig(user);
}

export async function updatePortfolioConfigForUser(userId, updates) {
  let updated = null;

  await updateStore((store) => {
    const index = store.users.findIndex((item) => item.id === userId);
    if (index === -1) throw new Error("User not found");

    const current = getUserPortfolioConfig(store.users[index]);
    updated = {
      ...current,
      ...updates,
      case_study_order: Array.isArray(updates.case_study_order)
        ? updates.case_study_order
        : current.case_study_order,
      featured_case_study_ids: Array.isArray(updates.featured_case_study_ids)
        ? updates.featured_case_study_ids
        : current.featured_case_study_ids,
      theme: updates.theme || current.theme || "evidence_lab",
      applied_template_id:
        updates.applied_template_id !== undefined
          ? updates.applied_template_id
          : current.applied_template_id ?? null,
    };

    store.users[index] = {
      ...store.users[index],
      portfolio_config: updated,
    };
    return store;
  });

  return updated;
}

export function applyPortfolioOrdering(caseStudies, config) {
  const order = config?.case_study_order || [];
  if (!order.length) {
    return [...caseStudies].sort((a, b) => a.sort_order - b.sort_order);
  }

  const rank = new Map(order.map((id, index) => [id, index]));
  return [...caseStudies].sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b.id) ? rank.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.sort_order - b.sort_order;
  });
}
