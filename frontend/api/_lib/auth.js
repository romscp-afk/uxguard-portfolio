import { createHmac } from "node:crypto";
import { getUserByEmail, getUserById } from "./demo-data.js";
import { verifyPassword } from "./passwords.js";
import { defaultPortfolioConfig } from "./roles.js";
import { updateStore } from "./store.js";

const JWT_SECRET = process.env.JWT_SECRET || "uxguard-vercel-demo-secret";
const DEMO_PASSWORD = "demo1234";

const RECOVERABLE_EMAILS = new Set([
  "demo@uxguard.io",
  "admin@uxguard.io",
  "alex@uxguard.io",
  "jordan@uxguard.io",
]);

/** Contact aliases only — demo and admin are separate accounts */
const EMAIL_ALIASES = {
  "alex@uxguard.io": ["demo@uxguard.io"],
  "demo@uxguard.io": ["alex@uxguard.io"],
};

const ACCOUNT_PROFILES = {
  "admin@uxguard.io": {
    email: "admin@uxguard.io",
    username: "romal-perera",
    name: "Romal Perera",
    title: "Founder · Super Admin",
    role: "admin",
    contact_email: "admin@uxguard.io",
  },
  "demo@uxguard.io": {
    email: "demo@uxguard.io",
    username: "alex-rivera",
    name: "Alex Rivera",
    title: "Senior UX Researcher",
    role: "professional",
    contact_email: "alex@uxguard.io",
  },
};

function base64Url(input) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function signToken(user, expiresInSeconds = 7 * 24 * 60 * 60) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64Url(
    JSON.stringify({
      sub: String(user.id),
      email: user.email,
      username: user.username,
      name: user.name,
      title: user.title,
      role: user.role || "professional",
      iat: now,
      exp: now + expiresInSeconds,
    }),
  );
  const data = `${header}.${body}`;
  return `${data}.${base64Url(createHmac("sha256", JWT_SECRET).update(data).digest())}`;
}

export function verifyToken(token) {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const data = `${header}.${body}`;
    if (base64Url(createHmac("sha256", JWT_SECRET).update(data).digest()) !== sig) return null;
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (payload.exp * 1000 < Date.now()) return null;
    return {
      userId: Number(payload.sub),
      email: payload.email,
      username: payload.username,
      name: payload.name,
      title: payload.title,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function requireAuth(req) {
  const raw =
    req?.headers?.authorization ||
    req?.headers?.Authorization ||
    req?.headers?.["Authorization"] ||
    "";
  const auth = Array.isArray(raw) ? raw[0] : String(raw || "");
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  return verifyToken(token);
}

function isRecoverableAccount(user) {
  if (!user) return false;
  const email = String(user.email || "").toLowerCase();
  const username = String(user.username || "").toLowerCase();
  return (
    RECOVERABLE_EMAILS.has(email) ||
    username === "romal-perera" ||
    username === "alex-rivera"
  );
}

function nextUserId(users) {
  return users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
}

function upsertLaunchAccount(store, profile) {
  if (!Array.isArray(store.users)) store.users = [];
  const email = profile.email.toLowerCase();
  let user =
    store.users.find((u) => String(u.email || "").toLowerCase() === email) ||
    store.users.find((u) => String(u.username || "").toLowerCase() === profile.username);

  if (!user) {
    user = {
      id: nextUserId(store.users),
      password: DEMO_PASSWORD,
      bio: null,
      avatar_url: null,
      cover_image_url: null,
      location: null,
      cv_url: null,
      social_links: {},
      onboarding_intent: "publish_case_studies",
      portfolio_config: defaultPortfolioConfig(),
      ...profile,
    };
    store.users.push(user);
  } else {
    Object.assign(user, profile);
    user.password = DEMO_PASSWORD;
  }

  return user;
}

async function findUserForLogin(needle) {
  let user = await getUserByEmail(needle);
  if (user) return user;
  for (const alt of EMAIL_ALIASES[needle] || []) {
    user = await getUserByEmail(alt);
    if (user) return user;
  }
  return null;
}

/**
 * Ensure Romal (admin) and Alex (professional) exist as separate accounts,
 * reset recoverable demo passwords, return the user matching the login email.
 */
async function recoverDemoLogin(needle) {
  let recovered = null;

  await updateStore((store) => {
    if (!Array.isArray(store.users)) store.users = [];

    const romal = upsertLaunchAccount(store, ACCOUNT_PROFILES["admin@uxguard.io"]);
    const alex = upsertLaunchAccount(store, ACCOUNT_PROFILES["demo@uxguard.io"]);

    // Demote any leftover demo-as-admin confusion on other recoverable users
    for (const user of store.users) {
      const email = String(user.email || "").toLowerCase();
      if (email === "demo@uxguard.io" || email === "alex@uxguard.io") {
        user.role = "professional";
        user.name = "Alex Rivera";
        user.username = user.username || "alex-rivera";
      }
      if (email === "admin@uxguard.io" || String(user.username || "").toLowerCase() === "romal-perera") {
        user.role = "admin";
        user.name = "Romal Perera";
        user.email = "admin@uxguard.io";
        user.username = "romal-perera";
      }
      if (isRecoverableAccount(user)) {
        user.password = DEMO_PASSWORD;
      }
    }

    recovered =
      store.users.find((u) => String(u.email || "").toLowerCase() === needle) ||
      (needle === "alex@uxguard.io" ? alex : null) ||
      (needle === "admin@uxguard.io" ? romal : null) ||
      (needle === "demo@uxguard.io" ? alex : null) ||
      null;

    return store;
  });

  return recovered;
}

export async function checkLogin(email, password) {
  const needle = String(email || "").trim().toLowerCase();
  if (!needle || !password) return null;

  let user = await findUserForLogin(needle);
  if (user && verifyPassword(password, user.password)) {
    // Keep launch identities correct even when password already matches
    if (needle === "admin@uxguard.io" || needle === "demo@uxguard.io" || needle === "alex@uxguard.io") {
      if (
        (needle === "admin@uxguard.io" && (user.name !== "Romal Perera" || user.role !== "admin")) ||
        ((needle === "demo@uxguard.io" || needle === "alex@uxguard.io") &&
          (user.name !== "Alex Rivera" || user.role === "admin"))
      ) {
        return (await recoverDemoLogin(needle)) || user;
      }
    }
    return user;
  }

  if (String(password) === DEMO_PASSWORD) {
    const recovered = await recoverDemoLogin(needle);
    if (recovered && verifyPassword(password, recovered.password)) {
      return recovered;
    }
  }

  return null;
}

export async function getAuthUser(req) {
  const session = requireAuth(req);
  if (!session) return null;

  const stored = await getUserById(session.userId);
  if (stored) return stored;

  if (session.username && session.email) {
    return {
      id: session.userId,
      email: session.email,
      username: session.username,
      name: session.name,
      title: session.title || null,
      bio: null,
      avatar_url: null,
      contact_email: session.email,
      location: null,
      cv_url: null,
      social_links: {},
      role: session.role || "professional",
    };
  }

  return null;
}

export async function requireAuthUser(req, res) {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ detail: "Not authenticated" });
    return null;
  }
  return user;
}
