import { createHash, randomBytes } from "node:crypto";
import { readStore, updateStore } from "../store.js";
import { isAdmin } from "../roles.js";
import { assertCanEdit } from "../projects.js";
import { trackHiringEvent } from "./analytics.js";
import { assertCompanyAccess, assertEmployerWorkspace, getCompanyForUser } from "./authz.js";
import {
  normalizeCompany,
  normalizeCompanyMember,
  normalizeInvitation,
  publicCompanyView,
  slugify,
} from "./schema.js";

export { assertCanEdit, assertEmployerWorkspace };

function nextId(list) {
  return (list || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export async function listCompaniesForUser(userId) {
  const store = await readStore();
  const uid = Number(userId);
  const memberCompanyIds = new Set(
    (store.company_members || [])
      .filter((m) => Number(m.user_id) === uid && m.status === "active")
      .map((m) => Number(m.company_id)),
  );
  return (store.companies || [])
    .filter((c) => !c.deleted_at)
    .filter((c) => Number(c.owner_user_id) === uid || memberCompanyIds.has(Number(c.id)))
    .map(normalizeCompany);
}

export async function getCompanyById(companyId, user = null, { publicOnly = false } = {}) {
  const store = await readStore();
  const company = (store.companies || []).find(
    (c) => Number(c.id) === Number(companyId) && !c.deleted_at,
  );
  if (!company) return null;
  if (publicOnly) return publicCompanyView(company);
  if (user) {
    assertCompanyAccess(store, companyId, user, null);
  }
  return normalizeCompany(company);
}

export async function createCompany(user, payload = {}) {
  assertCanEdit(user);
  assertEmployerWorkspace(user);
  let saved = null;
  await updateStore(
    (store) => {
      if (!store.companies) store.companies = [];
      if (!store.company_members) store.company_members = [];
      const existing = getCompanyForUser(store, user.id);
      if (existing) {
        const err = new Error("You already belong to a company. Multi-company accounts come later.");
        err.status = 400;
        throw err;
      }
      const now = new Date().toISOString();
      const id = nextId(store.companies);
      let slug = slugify(payload.display_name || payload.legal_name || `company-${id}`);
      const slugTaken = (store.companies || []).some((c) => c.slug === slug && !c.deleted_at);
      if (slugTaken) slug = `${slug}-${id}`;
      const company = normalizeCompany({
        ...payload,
        id,
        owner_user_id: user.id,
        slug,
        verification_status: "pending",
        terms_accepted_at: payload.terms_accepted ? now : null,
        created_at: now,
        updated_at: now,
      });
      if (!company.legal_name || !company.display_name) {
        const err = new Error("Legal name and display name are required");
        err.status = 400;
        throw err;
      }
      if (!company.terms_accepted_at) {
        const err = new Error("Employer terms must be accepted");
        err.status = 400;
        throw err;
      }
      // Employers cannot self-verify
      company.verification_status = "pending";
      store.companies.push(company);
      store.company_members.push(
        normalizeCompanyMember({
          id: nextId(store.company_members),
          company_id: id,
          user_id: user.id,
          email: user.email,
          role: "owner",
          status: "active",
          invited_by: user.id,
        }),
      );
      // Ensure employer workspace flag (do not force candidate portal on)
      const idx = store.users.findIndex((u) => Number(u.id) === Number(user.id));
      if (idx !== -1) {
        const prev = store.users[idx].workspaces || {};
        store.users[idx] = {
          ...store.users[idx],
          workspaces: {
            candidate: prev.candidate !== undefined ? Boolean(prev.candidate) : true,
            employer: true,
          },
          active_workspace: "employer",
          last_login_portal: "employer",
        };
      }
      saved = company;
      return store;
    },
    { forceRefresh: true },
  );
  await trackHiringEvent("employer_profile_completed", user.id, { company_id: saved.id });
  try {
    const { notifyPlatformAdmins } = await import("../community.js");
    await notifyPlatformAdmins({
      type: "employer_pending",
      title: "New employer company pending approval",
      message: `${saved.display_name} was submitted by ${user.name || user.email} and needs verification before jobs can be published.`,
      link: `/admin/employers/${saved.id}`,
    });
  } catch (err) {
    console.warn("[createCompany] admin notify failed", err.message);
  }
  return saved;
}

export async function updateCompany(companyId, user, payload = {}) {
  assertCanEdit(user);
  let saved = null;
  await updateStore(
    (store) => {
      assertCompanyAccess(store, companyId, user, "company_edit");
      const existing = (store.companies || []).find((c) => Number(c.id) === Number(companyId));
      const next = normalizeCompany({
        ...existing,
        ...payload,
        id: existing.id,
        owner_user_id: existing.owner_user_id,
        verification_status: existing.verification_status, // never self-set
        created_at: existing.created_at,
        updated_at: new Date().toISOString(),
      });
      store.companies = store.companies.map((c) => (Number(c.id) === Number(companyId) ? next : c));
      saved = next;
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function setCompanyVerification(companyId, adminUser, status, note = "") {
  if (!isAdmin(adminUser)) {
    const err = new Error("Only platform admins can change verification status");
    err.status = 403;
    throw err;
  }
  if (!["pending", "verified", "rejected", "suspended"].includes(status)) {
    const err = new Error("Invalid verification status");
    err.status = 400;
    throw err;
  }
  let saved = null;
  await updateStore(
    (store) => {
      const existing = (store.companies || []).find((c) => Number(c.id) === Number(companyId));
      if (!existing) {
        const err = new Error("Company not found");
        err.status = 404;
        throw err;
      }
      saved = normalizeCompany({
        ...existing,
        verification_status: status,
        moderation_note: note,
        verified_at: status === "verified" ? new Date().toISOString() : existing.verified_at || null,
        updated_at: new Date().toISOString(),
      });
      store.companies = store.companies.map((c) => (Number(c.id) === Number(companyId) ? saved : c));
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function listCompanyMembers(companyId, user) {
  const store = await readStore();
  assertCompanyAccess(store, companyId, user, "team_manage");
  return (store.company_members || [])
    .filter((m) => Number(m.company_id) === Number(companyId) && m.status !== "revoked")
    .map(normalizeCompanyMember);
}

export async function inviteCompanyMember(companyId, user, payload = {}) {
  assertCanEdit(user);
  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) {
    const err = new Error("Email is required");
    err.status = 400;
    throw err;
  }
  const role = payload.role || "reviewer";
  const token = randomBytes(24).toString("hex");
  let invitation = null;
  await updateStore(
    (store) => {
      assertCompanyAccess(store, companyId, user, "team_manage");
      if (!store.employer_invitations) store.employer_invitations = [];
      if (!store.company_members) store.company_members = [];
      const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      invitation = normalizeInvitation({
        id: nextId(store.employer_invitations),
        company_id: companyId,
        email,
        role,
        token_hash: hashToken(token),
        invited_by: user.id,
        assigned_job_ids: payload.assigned_job_ids || [],
        expires_at: expires,
      });
      store.employer_invitations.push(invitation);
      store.company_members.push(
        normalizeCompanyMember({
          id: nextId(store.company_members),
          company_id: companyId,
          user_id: null,
          email,
          role,
          status: "invited",
          invited_by: user.id,
          assigned_job_ids: payload.assigned_job_ids || [],
        }),
      );
      if (!store.hiring_audit_log) store.hiring_audit_log = [];
      store.hiring_audit_log.push({
        id: nextId(store.hiring_audit_log),
        company_id: Number(companyId),
        actor_user_id: user.id,
        action: "member_invited",
        meta: { email, role },
        created_at: new Date().toISOString(),
      });
      return store;
    },
    { forceRefresh: true },
  );
  return { invitation: { ...invitation, token_hash: undefined }, invite_token: token };
}

export async function updateCompanyMember(companyId, memberId, user, payload = {}) {
  assertCanEdit(user);
  let saved = null;
  await updateStore(
    (store) => {
      assertCompanyAccess(store, companyId, user, "team_manage");
      const existing = (store.company_members || []).find(
        (m) => Number(m.id) === Number(memberId) && Number(m.company_id) === Number(companyId),
      );
      if (!existing) {
        const err = new Error("Member not found");
        err.status = 404;
        throw err;
      }
      if (existing.role === "owner" && payload.role && payload.role !== "owner") {
        const err = new Error("Cannot demote the company owner");
        err.status = 400;
        throw err;
      }
      saved = normalizeCompanyMember({
        ...existing,
        ...payload,
        id: existing.id,
        company_id: existing.company_id,
        updated_at: new Date().toISOString(),
      });
      store.company_members = store.company_members.map((m) =>
        Number(m.id) === Number(memberId) ? saved : m,
      );
      if (!store.hiring_audit_log) store.hiring_audit_log = [];
      store.hiring_audit_log.push({
        id: nextId(store.hiring_audit_log),
        company_id: Number(companyId),
        actor_user_id: user.id,
        action: "member_updated",
        meta: { member_id: Number(memberId), role: saved.role, status: saved.status },
        created_at: new Date().toISOString(),
      });
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function getEmployerDashboard(user) {
  const store = await readStore();
  const company = getCompanyForUser(store, user.id);
  if (!company) {
    return { company: null, stats: null, jobs: [], recent_applications: [] };
  }
  const jobs = (store.jobs || []).filter(
    (j) => Number(j.company_id) === Number(company.id) && !j.deleted_at,
  );
  const apps = (store.job_applications || []).filter(
    (a) => Number(a.company_id) === Number(company.id),
  );
  const stats = {
    active_jobs: jobs.filter((j) => j.status === "published").length,
    draft_jobs: jobs.filter((j) => j.status === "draft").length,
    closed_jobs: jobs.filter((j) => j.status === "closed").length,
    expired_jobs: jobs.filter((j) => j.status === "expired").length,
    total_applications: apps.length,
    new_applications: apps.filter((a) => a.status === "submitted").length,
    shortlisted: apps.filter((a) => a.status === "shortlisted").length,
    interviews: apps.filter((a) => a.status === "interview").length,
    hires: apps.filter((a) => a.status === "hired").length,
  };
  return {
    company: normalizeCompany(company),
    stats,
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      updated_at: j.updated_at,
      published_at: j.published_at,
    })),
    recent_applications: apps
      .slice()
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        job_id: a.job_id,
        status: a.status,
        submitted_at: a.submitted_at,
        candidate_user_id: a.candidate_user_id,
      })),
  };
}
