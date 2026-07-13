import { readStore, updateStore } from "./store.js";
import { sanitizeUserMediaFields } from "./media.js";
import { normalizeRole } from "./roles.js";
import { toUserOut } from "./demo-data.js";

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

function stripInternal(user, store) {
  const cleaned = sanitizeUserMediaFields(user, store);
  const { __mediaSanitized: _flag, password: _password, ...rest } = cleaned;
  return {
    ...toUserOut(rest),
    case_study_count: (store.caseStudies || []).filter(
      (cs) => Number(cs.author_id) === Number(user.id),
    ).length,
    project_count: (store.projects || []).filter(
      (p) => Number(p.author_id) === Number(user.id),
    ).length,
    media_count: (store.mediaAssets || []).filter(
      (a) => Number(a.uploaded_by_id) === Number(user.id),
    ).length,
  };
}

export async function adminListUsers() {
  const store = await readStore();
  return (store.users || [])
    .map((user) => stripInternal(user, store))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

export async function adminGetUser(userId) {
  const store = await readStore();
  const uid = Number(userId);
  const user = (store.users || []).find((u) => Number(u.id) === uid);
  if (!user) return null;
  return stripInternal(user, store);
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
  let updated = null;

  await updateStore((store) => {
    const index = (store.users || []).findIndex((u) => Number(u.id) === uid);
    if (index === -1) throw new Error("User not found");

    const current = store.users[index];
    const next = { ...current };

    for (const [key, value] of Object.entries(updates || {})) {
      if (!ADMIN_EDITABLE.has(key)) continue;

      if (key === "role") {
        const role = normalizeRole(value);
        // Prevent demoting the last admin
        if (current.role === "admin" && role !== "admin") {
          const otherAdmins = store.users.filter(
            (u) => Number(u.id) !== uid && normalizeRole(u.role) === "admin",
          );
          if (otherAdmins.length === 0) {
            throw new Error("Cannot demote the last admin account.");
          }
        }
        // Prevent demoting yourself while editing
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
    updated = next;
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

  await updateStore((store) => {
    const user = (store.users || []).find((u) => Number(u.id) === uid);
    if (!user) throw new Error("User not found");

    if (normalizeRole(user.role) === "admin") {
      const otherAdmins = store.users.filter(
        (u) => Number(u.id) !== uid && normalizeRole(u.role) === "admin",
      );
      if (otherAdmins.length === 0) {
        throw new Error("Cannot delete the last admin account.");
      }
    }

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

    return store;
  });

  return { ok: true, id: uid };
}
