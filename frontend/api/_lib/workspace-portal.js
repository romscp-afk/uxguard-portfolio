/**
 * Employer portal is opt-in via employer login/register only.
 * Legacy switcher users who were stuck on employer are treated as candidates
 * unless account_type or last_login_portal says otherwise.
 */
export function resolveActiveWorkspace(user) {
  const workspaces = user?.workspaces || {};
  const hasEmployer = Boolean(workspaces.employer);
  if (!hasEmployer) return "candidate";

  if (user?.account_type === "employer") return "employer";
  if (user?.last_login_portal === "employer") return "employer";

  // Default / legacy: always candidate portal
  return "candidate";
}

export function isEmployerOnlyAccount(user) {
  return user?.account_type === "employer" && user?.workspaces?.candidate === false;
}
