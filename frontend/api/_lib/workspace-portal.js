/**
 * Employer portal is opt-in via employer login/register only.
 * Platform admins always use the candidate/super-admin portal.
 * Legacy switcher users stuck on employer are treated as candidates
 * unless account_type or last_login_portal says otherwise.
 */
export function resolveActiveWorkspace(user) {
  if (user?.role === "admin") return "candidate";

  const workspaces = user?.workspaces || {};
  const hasEmployer = Boolean(workspaces.employer);
  if (!hasEmployer) return "candidate";

  if (user?.account_type === "employer") return "employer";
  if (user?.last_login_portal === "employer") return "employer";

  // Default / legacy: always candidate portal
  return "candidate";
}

export function isEmployerOnlyAccount(user) {
  if (user?.role === "admin") return false;
  return user?.account_type === "employer" && user?.workspaces?.candidate === false;
}
