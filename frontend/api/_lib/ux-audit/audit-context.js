/**
 * Business context from the questionnaire — drives check applicability.
 * @typedef {object} AuditBusinessContext
 * @property {string} [page_type]
 * @property {string} [primary_goal]
 * @property {string} [target_action]
 */

const ECOMMERCE_TYPES = new Set(["ecommerce", "Ecommerce"]);
const SAAS_TYPES = new Set(["SaaS / web application", "saas", "SaaS"]);
const LANDING_TYPES = new Set(["Landing page", "landing page"]);
const PORTFOLIO_TYPES = new Set(["Portfolio", "portfolio"]);

export function normalizePageType(pageType) {
  return String(pageType || "Company website").trim();
}

export function isEcommerce(ctx) {
  const t = normalizePageType(ctx?.page_type);
  return ECOMMERCE_TYPES.has(t) || /ecommerce|shop|store/i.test(t);
}

export function isLandingPage(ctx) {
  return LANDING_TYPES.has(normalizePageType(ctx?.page_type));
}

export function isPortfolio(ctx) {
  return PORTFOLIO_TYPES.has(normalizePageType(ctx?.page_type));
}

export function isSaaS(ctx) {
  const t = normalizePageType(ctx?.page_type);
  return SAAS_TYPES.has(t) || /saas|web application/i.test(t);
}

export function requiresSiteSearch(ctx) {
  return isEcommerce(ctx) || /content|publication/i.test(normalizePageType(ctx?.page_type));
}

export function requiresCheckoutChecks(ctx) {
  return isEcommerce(ctx);
}

export function requiresFixedPricing(ctx) {
  return isEcommerce(ctx) || /sales|purchase/i.test(String(ctx?.primary_goal || ""));
}

export function requiresContactTransparency(ctx) {
  return !isPortfolio(ctx);
}
