import { normalizeRole } from "../roles.js";

export const PERMISSIONS = {
  project_read: ["owner", "test_manager", "tester", "developer", "product_reviewer", "viewer"],
  project_write: ["owner", "test_manager"],
  project_delete: ["owner"],
  members_manage: ["owner", "test_manager"],
  targets_manage: ["owner", "test_manager", "developer"],
  requirements_write: ["owner", "test_manager", "product_reviewer", "developer"],
  tests_write: ["owner", "test_manager", "tester", "developer"],
  runs_trigger: ["owner", "test_manager", "tester"],
  runs_cancel: ["owner", "test_manager", "tester"],
  secrets_manage: ["owner", "test_manager"],
  defects_write: ["owner", "test_manager", "tester", "developer", "product_reviewer"],
  schedules_manage: ["owner", "test_manager"],
  reports_read: ["owner", "test_manager", "tester", "developer", "product_reviewer", "viewer"],
};

export function roleHasPermission(role, permission) {
  const allowed = PERMISSIONS[permission] || [];
  return allowed.includes(role);
}

export function resolveProjectRole(store, projectId, user) {
  if (!user) return null;
  if (normalizeRole(user.role) === "admin") return "owner";

  const pid = String(projectId || "").trim();
  const project = (store.testlab_projects || []).find(
    (p) => String(p.id || "").trim() === pid && !p.deleted_at,
  );
  if (!project) return null;

  if (Number(project.owner_user_id) === Number(user.id)) return "owner";

  const member = (store.testlab_project_members || []).find(
    (m) =>
      String(m.project_id || "").trim() === pid &&
      (Number(m.user_id) === Number(user.id) ||
        (m.email && m.email.toLowerCase() === String(user.email || "").toLowerCase())),
  );
  return member?.role || null;
}

export function assertProjectPermission(store, projectId, user, permission) {
  const role = resolveProjectRole(store, projectId, user);
  if (!role || !roleHasPermission(role, permission)) {
    const err = new Error("You do not have permission for this TestLab action");
    err.status = 403;
    err.code = "TESTLAB_FORBIDDEN";
    throw err;
  }
  return role;
}

export function canAccessPlatformTestLab(user) {
  if (!user) return false;
  // Temporarily admin-only while TestLab is in private testing.
  return normalizeRole(user.role) === "admin";
}

export function assertCanAccessTestLab(user) {
  if (!canAccessPlatformTestLab(user)) {
    const err = new Error("TestLab is currently available to admin accounts only");
    err.status = 403;
    throw err;
  }
}
