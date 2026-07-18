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

export function assertCanEdit(user) {
  if (!canEditPlatform(user)) {
    const error = new Error("Your account is read-only. Upgrade to Professional to edit.");
    error.status = 403;
    throw error;
  }
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === "admin";
}

/** Product workspaces — orthogonal to platform role (admin/professional/viewer). */
export function defaultWorkspaces(user) {
  const canEdit = canEditPlatform(user);
  const existing = user?.workspaces && typeof user.workspaces === "object" ? user.workspaces : {};
  return {
    candidate: existing.candidate !== undefined ? Boolean(existing.candidate) : canEdit,
    employer: existing.employer !== undefined ? Boolean(existing.employer) : false,
  };
}

export function normalizeActiveWorkspace(value, workspaces) {
  if (value === "employer" && workspaces?.employer) return "employer";
  return "candidate";
}

export function assertCandidateWorkspace(user) {
  const workspaces = defaultWorkspaces(user);
  if (!workspaces.candidate && !isAdmin(user)) {
    const err = new Error("Candidate workspace is not available for this account");
    err.status = 403;
    throw err;
  }
}

export function assertEmployerWorkspace(user) {
  const workspaces = defaultWorkspaces(user);
  if (!workspaces.employer && !isAdmin(user)) {
    const err = new Error("Employer workspace is not enabled for this account");
    err.status = 403;
    throw err;
  }
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
