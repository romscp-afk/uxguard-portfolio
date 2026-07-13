import {
  readStore,
  updateStore,
  listRegistrationRecords,
  deleteRegistrationRecord,
} from "./store.js";
import { sanitizeUserMediaFields } from "./media.js";
import { defaultPortfolioConfig, normalizeRole } from "./roles.js";

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

function toAdminUserOut(user, store) {
  if (!user || typeof user !== "object") return null;
  const cleaned = sanitizeUserMediaFields(user, store) || user;
  const { __mediaSanitized: _flag, password: _password, ...rest } = cleaned;
  const id = Number(rest.id);
  if (!Number.isFinite(id)) return null;

  return {
    id,
    email: rest.email || "",
    username: rest.username || `user-${id}`,
    name: rest.name || rest.username || `User ${id}`,
    title: rest.title || null,
    bio: rest.bio || null,
    avatar_url: rest.avatar_url || null,
    cover_image_url: rest.cover_image_url || null,
    contact_email: rest.contact_email || null,
    location: rest.location || null,
    signup_location: rest.signup_location || null,
    signup_country: rest.signup_country || null,
    signup_city: rest.signup_city || null,
    signup_region: rest.signup_region || null,
    cv_url: rest.cv_url || null,
    social_links: rest.social_links && typeof rest.social_links === "object" ? rest.social_links : {},
    role: normalizeRole(rest.role),
    onboarding_intent: rest.onboarding_intent || "build_portfolio",
    portfolio_config: {
      ...defaultPortfolioConfig(),
      ...(rest.portfolio_config || {}),
    },
    portfolio_url: `/u/${rest.username || `user-${id}`}`,
    created_at: rest.created_at || null,
    case_study_count: (store.caseStudies || []).filter(
      (cs) => Number(cs.author_id) === id,
    ).length,
    project_count: (store.projects || []).filter((p) => Number(p.author_id) === id).length,
    media_count: (store.mediaAssets || []).filter((a) => Number(a.uploaded_by_id) === id).length,
  };
}

function mergeUsersWithRegistrations(storeUsers = [], records = []) {
  const byEmail = new Map();
  const byId = new Map();
  const merged = [];

  function add(user) {
    if (!user || typeof user !== "object") return;
    const email = String(user.email || "").trim().toLowerCase();
    const id = Number(user.id);
    if (email && byEmail.has(email)) return;
    if (Number.isFinite(id) && byId.has(id)) return;
    merged.push(user);
    if (email) byEmail.set(email, user);
    if (Number.isFinite(id)) byId.set(id, user);
  }

  for (const user of storeUsers) add(user);
  for (const record of records) add(record);
  return merged;
}

function findMissingRegistrations(storeUsers = [], records = []) {
  const byEmail = new Set(
    storeUsers.map((u) => String(u.email || "").trim().toLowerCase()).filter(Boolean),
  );
  const byId = new Set(
    storeUsers.map((u) => Number(u.id)).filter((id) => Number.isFinite(id)),
  );
  return records.filter((record) => {
    const email = String(record.email || "").trim().toLowerCase();
    const id = Number(record.id);
    if (email && byEmail.has(email)) return false;
    if (Number.isFinite(id) && byId.has(id)) return false;
    return Boolean(email || Number.isFinite(id));
  });
}

async function repairMissingUsersInStore(missing) {
  if (!missing.length) return;

  await updateStore((store) => {
    const existingIds = new Set((store.users || []).map((u) => Number(u.id)));
    const existingEmails = new Set(
      (store.users || []).map((u) => String(u.email || "").toLowerCase()),
    );
    let nextId =
      (store.users || []).reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;

    for (const record of missing) {
      const email = String(record.email || "").toLowerCase();
      if (email && existingEmails.has(email)) continue;

      let id = Number(record.id);
      if (!Number.isFinite(id) || existingIds.has(id)) {
        id = nextId;
        nextId += 1;
      }

      const restored = { ...record, id };
      store.users.push(restored);
      existingIds.add(id);
      if (email) existingEmails.add(email);
    }
    return store;
  }, { forceRefresh: true });
}

/** Always reload from Blob + registration sidecars so worldwide signups show immediately. */
export async function adminListUsers() {
  const store = await readStore({ forceRefresh: true });
  let records = [];
  try {
    records = await listRegistrationRecords();
  } catch (err) {
    console.error("[adminListUsers] registration scan failed", err);
  }

  const storeUsers = store.users || [];
  // Merge in-memory for the response. Do NOT re-read the main store afterward —
  // Blob get() can stay stale and would wipe newly registered users from the list.
  const users = mergeUsersWithRegistrations(storeUsers, records);
  const missing = findMissingRegistrations(storeUsers, records);

  if (missing.length) {
    repairMissingUsersInStore(missing).catch((err) => {
      console.error("[adminListUsers] background repair failed", err);
    });
  }

  return users
    .map((user) => {
      try {
        return toAdminUserOut(user, store);
      } catch (err) {
        console.error("[adminListUsers] skip user", user?.id, err);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

export async function adminGetUser(userId) {
  const store = await readStore({ forceRefresh: true });
  const uid = Number(userId);
  const user = (store.users || []).find((u) => Number(u.id) === uid);
  if (!user) return null;
  return toAdminUserOut(user, store);
}

const ADMIN_EDITABLE = new Set([
  "name",
  "email",
  "username",
  "title",
  "bio",
  "avatar_url",
  "cover_image_url",
  "contact_email",
  "location",
  "cv_url",
  "social_links",
  "role",
  "onboarding_intent",
  "password",
]);

export async function adminUpdateUser(userId, updates, actorId) {
  const uid = Number(userId);

  await updateStore((store) => {
    const index = (store.users || []).findIndex((u) => Number(u.id) === uid);
    if (index === -1) throw new Error("User not found");

    const current = store.users[index];
    const next = { ...current };

    for (const [key, value] of Object.entries(updates || {})) {
      if (!ADMIN_EDITABLE.has(key)) continue;

      if (key === "role") {
        const role = normalizeRole(value);
        if (current.role === "admin" && role !== "admin") {
          const otherAdmins = store.users.filter(
            (u) => Number(u.id) !== uid && normalizeRole(u.role) === "admin",
          );
          if (otherAdmins.length === 0) {
            throw new Error("Cannot demote the last admin account.");
          }
        }
        if (Number(actorId) === uid && role !== "admin" && normalizeRole(current.role) === "admin") {
          throw new Error("You cannot remove your own admin role.");
        }
        next.role = role;
        continue;
      }

      if (key === "username") {
        const username = slugifyUsername(value);
        const taken = store.users.find(
          (u) => u.username === username && Number(u.id) !== uid,
        );
        if (taken) throw new Error("Username already taken");
        next.username = username;
        continue;
      }

      if (key === "email") {
        const email = String(value || "").trim().toLowerCase();
        if (!email.includes("@")) throw new Error("Valid email is required");
        const taken = store.users.find(
          (u) => String(u.email || "").toLowerCase() === email && Number(u.id) !== uid,
        );
        if (taken) throw new Error("Email already in use");
        next.email = email;
        continue;
      }

      if (key === "password") {
        const password = String(value || "");
        if (password && password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        if (password) next.password = password;
        continue;
      }

      if (key === "social_links") {
        if (!value || typeof value !== "object") {
          next.social_links = {};
        } else {
          const links = {};
          for (const [k, v] of Object.entries(value)) {
            if (typeof v === "string" && v.trim()) links[k] = v.trim();
          }
          next.social_links = links;
        }
        continue;
      }

      if (typeof value === "string") {
        next[key] = value.trim() || null;
      } else {
        next[key] = value ?? null;
      }
    }

    store.users[index] = next;
    return store;
  });

  return adminGetUser(uid);
}

export async function adminDeleteUser(userId, actorId) {
  const uid = Number(userId);
  const aid = Number(actorId);

  if (uid === aid) {
    throw new Error("You cannot delete your own account from Admin Users.");
  }

  let deletedEmail = null;

  await updateStore((store) => {
    const user = (store.users || []).find((u) => Number(u.id) === uid);
    if (!user) throw new Error("User not found");
    deletedEmail = user.email || null;

    if (normalizeRole(user.role) === "admin") {
      const otherAdmins = store.users.filter(
        (u) => Number(u.id) !== uid && normalizeRole(u.role) === "admin",
      );
      if (otherAdmins.length === 0) {
        throw new Error("Cannot delete the last admin account.");
      }
    }

    const removedCaseStudyIds = (store.caseStudies || [])
      .filter((cs) => Number(cs.author_id) === uid)
      .map((cs) => Number(cs.id));
    const removedProjectIds = (store.projects || [])
      .filter((p) => Number(p.author_id) === uid)
      .map((p) => Number(p.id));
    const removedMediaIds = (store.mediaAssets || [])
      .filter((a) => Number(a.uploaded_by_id) === uid)
      .map((a) => Number(a.id));

    store.users = store.users.filter((u) => Number(u.id) !== uid);
    store.caseStudies = (store.caseStudies || []).filter((cs) => Number(cs.author_id) !== uid);
    store.projects = (store.projects || []).filter((p) => Number(p.author_id) !== uid);
    store.mediaAssets = (store.mediaAssets || []).filter(
      (a) => Number(a.uploaded_by_id) !== uid,
    );
    store.follows = (store.follows || []).filter(
      (f) => Number(f.follower_id) !== uid && Number(f.following_id) !== uid,
    );
    store.comments = (store.comments || []).filter((c) => Number(c.author_id) !== uid);
    store.likes = (store.likes || []).filter((l) => Number(l.user_id) !== uid);
    store.notifications = (store.notifications || []).filter((n) => Number(n.user_id) !== uid);
    store.subscriptions = (store.subscriptions || []).filter((s) => Number(s.user_id) !== uid);
    store.user_usage = (store.user_usage || []).filter((u) => Number(u.user_id) !== uid);
    store.user_ai_credits = (store.user_ai_credits || []).filter((c) => Number(c.user_id) !== uid);
    store.ai_conversations = (store.ai_conversations || []).filter(
      (c) => Number(c.user_id) !== uid,
    );
    store.saved_ai_outputs = (store.saved_ai_outputs || []).filter(
      (o) => Number(o.user_id) !== uid,
    );
    store.payment_transactions = (store.payment_transactions || []).filter(
      (t) => Number(t.user_id) !== uid,
    );
    store.subscription_events = (store.subscription_events || []).filter(
      (e) => Number(e.user_id) !== uid,
    );

    // Prevent Blob race-merge from resurrecting intentionally removed rows.
    store.__uxguardDeleted = {
      users: [uid],
      caseStudies: removedCaseStudyIds,
      projects: removedProjectIds,
      mediaAssets: removedMediaIds,
    };

    return store;
  }, { forceRefresh: true });

  await deleteRegistrationRecord(uid, deletedEmail);

  return { ok: true, id: uid };
}
