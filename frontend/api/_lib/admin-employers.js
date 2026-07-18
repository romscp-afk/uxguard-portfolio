import { readStore, updateStore } from "./store.js";
import { isAdmin, defaultPortfolioConfig, normalizeRole, resolveUserRole } from "./roles.js";
import { createNotification } from "./community.js";
import { normalizeCompany } from "./hiring/schema.js";
import { setCompanyVerification } from "./hiring/companies.js";
import { toUserOut } from "./demo-data.js";

function nextId(list) {
  return (list || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function slugifyUsername(text) {
  return (
    String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "user"
  );
}

export async function adminListEmployers({ status } = {}) {
  const store = await readStore();
  const usersById = new Map((store.users || []).map((u) => [Number(u.id), u]));
  let companies = (store.companies || [])
    .filter((c) => !c.deleted_at)
    .map((c) => normalizeCompany(c));

  if (status && status !== "all") {
    companies = companies.filter((c) => c.verification_status === status);
  }

  return companies
    .map((company) => {
      const owner = usersById.get(Number(company.owner_user_id));
      const jobCount = (store.jobs || []).filter(
        (j) => Number(j.company_id) === Number(company.id) && !j.deleted_at,
      ).length;
      const memberCount = (store.company_members || []).filter(
        (m) => Number(m.company_id) === Number(company.id) && m.status === "active",
      ).length;
      return {
        ...company,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
              username: owner.username,
              account_type: owner.account_type || "candidate",
            }
          : null,
        job_count: jobCount,
        member_count: memberCount,
      };
    })
    .sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));
}

export async function adminGetEmployer(companyId) {
  const store = await readStore();
  const company = (store.companies || []).find(
    (c) => Number(c.id) === Number(companyId) && !c.deleted_at,
  );
  if (!company) return null;
  const normalized = normalizeCompany(company);
  const owner = (store.users || []).find((u) => Number(u.id) === Number(normalized.owner_user_id));
  const members = (store.company_members || [])
    .filter((m) => Number(m.company_id) === Number(companyId) && m.status !== "revoked")
    .map((m) => {
      const u = (store.users || []).find((user) => Number(user.id) === Number(m.user_id));
      return {
        ...m,
        user_name: u?.name || null,
        user_email: u?.email || m.email,
      };
    });
  const jobs = (store.jobs || [])
    .filter((j) => Number(j.company_id) === Number(companyId) && !j.deleted_at)
    .map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      updated_at: j.updated_at,
      published_at: j.published_at,
    }));

  // Also list pending employer accounts without a company yet
  return {
    company: normalized,
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          username: owner.username,
          account_type: owner.account_type,
          created_at: owner.created_at,
          title: owner.title,
        }
      : null,
    members,
    jobs,
  };
}

export async function adminListPendingEmployerAccounts() {
  const store = await readStore();
  const companyOwnerIds = new Set(
    (store.companies || []).filter((c) => !c.deleted_at).map((c) => Number(c.owner_user_id)),
  );
  return (store.users || [])
    .filter(
      (u) =>
        (u.account_type === "employer" || u.workspaces?.employer) &&
        normalizeRole(u.role) !== "admin" &&
        !companyOwnerIds.has(Number(u.id)),
    )
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username,
      title: u.title,
      account_type: u.account_type || "employer",
      created_at: u.created_at,
      status: "awaiting_company_profile",
    }))
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

export async function adminVerifyEmployer(companyId, adminUser, status, note = "") {
  const company = await setCompanyVerification(companyId, adminUser, status, note);
  // Notify company owner
  if (company?.owner_user_id) {
    const labels = {
      verified: "approved",
      rejected: "rejected",
      suspended: "suspended",
      pending: "set back to pending",
    };
    try {
      await createNotification({
        userId: company.owner_user_id,
        type: "employer_verification",
        title: `Employer profile ${labels[status] || status}`,
        message:
          note ||
          (status === "verified"
            ? "Your company is verified. You can now publish jobs."
            : `Your company verification status is now: ${status}.`),
        link: "/admin/employer",
      });
    } catch {
      /* ignore */
    }
  }
  return company;
}

/**
 * Super admin creates a candidate or employer account.
 */
export async function adminCreateAccount(adminUser, payload = {}) {
  if (!isAdmin(adminUser)) {
    const err = new Error("Admin access required");
    err.status = 403;
    throw err;
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const name = String(payload.name || "").trim();
  const password = String(payload.password || "").trim();
  const accountType = payload.account_type === "employer" ? "employer" : "candidate";
  const role = payload.role === "viewer" ? "viewer" : "professional";

  if (!email || !name || !password) {
    const err = new Error("Name, email, and password are required");
    err.status = 400;
    throw err;
  }
  if (password.length < 8) {
    const err = new Error("Password must be at least 8 characters");
    err.status = 400;
    throw err;
  }

  let created = null;
  await updateStore(
    (store) => {
      if ((store.users || []).some((u) => String(u.email || "").toLowerCase() === email)) {
        const err = new Error("Email already registered");
        err.status = 400;
        throw err;
      }
      const id = nextId(store.users);
      let username = slugifyUsername(payload.username || name);
      if ((store.users || []).some((u) => u.username === username)) {
        username = `${username}-${id}`;
      }
      const isEmployer = accountType === "employer";
      created = {
        id,
        email,
        password,
        username,
        name,
        title: payload.title || (isEmployer ? "Hiring manager" : null),
        bio: null,
        avatar_url: null,
        cover_image_url: null,
        contact_email: email,
        location: null,
        cv_url: null,
        social_links: {},
        role: resolveUserRole(email, role),
        onboarding_intent: isEmployer ? "build_portfolio" : payload.onboarding_intent || "build_portfolio",
        account_type: isEmployer ? "employer" : "candidate",
        workspaces: isEmployer
          ? { candidate: false, employer: true }
          : { candidate: true, employer: false },
        active_workspace: isEmployer ? "employer" : "candidate",
        last_login_portal: isEmployer ? "employer" : "candidate",
        portfolio_config: defaultPortfolioConfig(),
        created_by_admin_id: adminUser.id,
        created_at: new Date().toISOString(),
      };
      store.users.push(created);

      // Optional company shell for employer accounts
      if (isEmployer && (payload.company_name || payload.legal_name)) {
        if (!store.companies) store.companies = [];
        if (!store.company_members) store.company_members = [];
        const companyId = nextId(store.companies);
        const company = normalizeCompany({
          id: companyId,
          owner_user_id: id,
          legal_name: payload.legal_name || payload.company_name,
          display_name: payload.company_name || payload.legal_name,
          industry: payload.industry || "",
          website: payload.website || "",
          contact_email: email,
          verification_status: payload.auto_verify ? "verified" : "pending",
          terms_accepted_at: new Date().toISOString(),
          moderation_note: payload.auto_verify ? "Auto-verified by super admin on create" : "",
        });
        store.companies.push(company);
        store.company_members.push({
          id: nextId(store.company_members),
          company_id: companyId,
          user_id: id,
          email,
          role: "owner",
          status: "active",
          invited_by: adminUser.id,
          created_at: new Date().toISOString(),
        });
        created._company_id = companyId;
      }
      return store;
    },
    { forceRefresh: true },
  );

  return {
    user: toUserOut(created),
    company_id: created._company_id || null,
    temporary_password: password,
  };
}
