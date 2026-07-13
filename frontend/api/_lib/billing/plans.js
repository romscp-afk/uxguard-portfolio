/**
 * Central UXGuard plan configuration (server-side source of truth).
 * Unlimited limits use `null` — never arbitrary large numbers.
 */

export const PLAN_CODES = {
  FREE: "free",
  PROFESSIONAL: "professional",
  TEAM: "team",
  ENTERPRISE: "enterprise",
};

/** @typedef {{ code: string, name: string, description: string, monthly_price: number|null, annual_price: number|null, currency: string, ai_credits: number|null, storage_limit_bytes: number|null, portfolio_limit: number|null, case_study_limit: number|null, team_member_limit: number|null, custom_domain_enabled: boolean, private_projects_enabled: boolean, advanced_analytics_enabled: boolean, pdf_export_enabled: boolean, team_workspace_enabled: boolean, ai_tools_enabled: boolean, interview_prep_enabled: boolean, is_active: boolean, highlight?: boolean }} PlanDefinition */

/** @type {PlanDefinition[]} */
export const PLAN_DEFINITIONS = [
  {
    code: PLAN_CODES.FREE,
    name: "Free",
    description: "Start building your UX portfolio with no payment method required.",
    monthly_price: 0,
    annual_price: 0,
    currency: "USD",
    ai_credits: 10,
    storage_limit_bytes: 500 * 1024 * 1024,
    portfolio_limit: 1,
    case_study_limit: 2,
    team_member_limit: 1,
    custom_domain_enabled: false,
    private_projects_enabled: false,
    advanced_analytics_enabled: false,
    pdf_export_enabled: false,
    team_workspace_enabled: false,
    ai_tools_enabled: true,
    interview_prep_enabled: false,
    is_active: true,
  },
  {
    code: PLAN_CODES.PROFESSIONAL,
    name: "Professional",
    description: "Unlimited case studies, advanced AI tools, and career-ready exports.",
    monthly_price: 15,
    annual_price: 144,
    currency: "USD",
    ai_credits: 200,
    storage_limit_bytes: 10 * 1024 * 1024 * 1024,
    portfolio_limit: null,
    case_study_limit: null,
    team_member_limit: 1,
    custom_domain_enabled: true,
    private_projects_enabled: true,
    advanced_analytics_enabled: true,
    pdf_export_enabled: true,
    team_workspace_enabled: false,
    ai_tools_enabled: true,
    interview_prep_enabled: true,
    is_active: true,
    highlight: true,
  },
  {
    code: PLAN_CODES.TEAM,
    name: "Team",
    description: "Shared workspace for UX teams with pooled AI credits and collaboration.",
    monthly_price: 39,
    annual_price: 390,
    currency: "USD",
    ai_credits: 600,
    storage_limit_bytes: 100 * 1024 * 1024 * 1024,
    portfolio_limit: null,
    case_study_limit: null,
    team_member_limit: 5,
    custom_domain_enabled: true,
    private_projects_enabled: true,
    advanced_analytics_enabled: true,
    pdf_export_enabled: true,
    team_workspace_enabled: true,
    ai_tools_enabled: true,
    interview_prep_enabled: true,
    is_active: true,
  },
  {
    code: PLAN_CODES.ENTERPRISE,
    name: "Enterprise",
    description: "Custom limits, SSO, private AI, and dedicated support.",
    monthly_price: null,
    annual_price: null,
    currency: "USD",
    ai_credits: null,
    storage_limit_bytes: null,
    portfolio_limit: null,
    case_study_limit: null,
    team_member_limit: null,
    custom_domain_enabled: true,
    private_projects_enabled: true,
    advanced_analytics_enabled: true,
    pdf_export_enabled: true,
    team_workspace_enabled: true,
    ai_tools_enabled: true,
    interview_prep_enabled: true,
    is_active: true,
  },
];

export function getPlanByCode(code) {
  return PLAN_DEFINITIONS.find((p) => p.code === code) || null;
}

export function getActivePlans() {
  return PLAN_DEFINITIONS.filter((p) => p.is_active);
}

export function isUnlimited(value) {
  return value === null || value === undefined;
}

export function formatBytes(bytes) {
  if (bytes == null) return "Unlimited";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb % 1 === 0 ? gb : gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb % 1 === 0 ? mb : mb.toFixed(0)} MB`;
}
