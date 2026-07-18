import { isAdmin } from "../roles.js";
import { DEFAULT_MEMBER_PERMISSIONS } from "./schema.js";

export function getActiveMembership(store, companyId, userId) {
  return (store.company_members || []).find(
    (item) =>
      Number(item.company_id) === Number(companyId) &&
      Number(item.user_id) === Number(userId) &&
      item.status === "active",
  );
}

export function getCompanyForUser(store, userId) {
  const uid = Number(userId);
  const owned = (store.companies || []).find(
    (c) => Number(c.owner_user_id) === uid && !c.deleted_at,
  );
  if (owned) return owned;
  const membership = (store.company_members || []).find(
    (m) => Number(m.user_id) === uid && m.status === "active",
  );
  if (!membership) return null;
  return (store.companies || []).find(
    (c) => Number(c.id) === Number(membership.company_id) && !c.deleted_at,
  );
}

export function memberCan(member, permission) {
  if (!member || member.status !== "active") return false;
  const roleDefaults = DEFAULT_MEMBER_PERMISSIONS[member.role] || {};
  const perms = { ...roleDefaults, ...(member.permissions || {}) };
  return Boolean(perms[permission]);
}

export function assertCompanyAccess(store, companyId, user, permission = "candidate_access") {
  if (isAdmin(user)) {
    return { company: (store.companies || []).find((c) => Number(c.id) === Number(companyId)), member: null, admin: true };
  }
  const company = (store.companies || []).find(
    (c) => Number(c.id) === Number(companyId) && !c.deleted_at,
  );
  if (!company) {
    const err = new Error("Company not found");
    err.status = 404;
    throw err;
  }
  if (company.verification_status === "suspended") {
    const err = new Error("Company account is suspended");
    err.status = 403;
    throw err;
  }
  const member = getActiveMembership(store, companyId, user.id);
  if (!member && Number(company.owner_user_id) !== Number(user.id)) {
    const err = new Error("You do not have access to this company");
    err.status = 403;
    throw err;
  }
  const effectiveMember =
    member ||
    ({
      role: "owner",
      status: "active",
      permissions: DEFAULT_MEMBER_PERMISSIONS.owner,
      user_id: user.id,
      company_id: companyId,
    });
  if (permission && !memberCan(effectiveMember, permission) && !isAdmin(user)) {
    const err = new Error("Insufficient company permissions");
    err.status = 403;
    throw err;
  }
  return { company, member: effectiveMember, admin: false };
}

export function assertEmployerWorkspace(user) {
  if (isAdmin(user)) return;
  if (!user?.workspaces?.employer) {
    const err = new Error("Employer workspace is not enabled");
    err.status = 403;
    throw err;
  }
}
