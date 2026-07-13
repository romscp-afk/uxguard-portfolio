const ADMIN_EMAIL = (process.env.CONTACT_TO || "uxguardstudio@gmail.com").toLowerCase();

export const PLATFORM_INTENTS = [
  "build_portfolio",
  "track_career",
  "publish_case_studies",
];

export function resolveUserRole(email, requestedRole) {
  if (String(email || "").toLowerCase() === ADMIN_EMAIL) {
    return "admin";
  }
  if (requestedRole === "viewer") {
    return "viewer";
  }
  return "professional";
}

export function normalizeRole(role) {
  if (role === "admin" || role === "professional" || role === "viewer") {
    return role;
  }
  if (role === "researcher") {
    return "professional";
  }
  return "professional";
}

export function canEditPlatform(user) {
  const role = normalizeRole(user?.role);
  return role === "admin" || role === "professional";
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === "admin";
}

export function defaultPortfolioConfig() {
  return {
    show_profile: true,
    show_projects: true,
    show_case_studies: true,
    show_timeline: false,
    show_achievements: false,
    show_analytics: false,
    case_study_order: [],
    featured_case_study_ids: [],
    theme: "evidence_lab",
    applied_template_id: null,
  };
}
