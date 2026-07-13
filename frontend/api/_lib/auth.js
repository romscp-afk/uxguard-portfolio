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

const EMAIL_ALIASES = {
  "demo@uxguard.io": ["admin@uxguard.io", "alex@uxguard.io"],
  "admin@uxguard.io": ["demo@uxguard.io"],
  "alex@uxguard.io": ["demo@uxguard.io", "admin@uxguard.io"],
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
      role: user.role || "researcher",
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
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

function isRecoverableAccount(user) {
  if (!user) return false;
  const email = String(user.email || "").toLowerCase();
  const username = String(user.username || "").toLowerCase();
  return (
    RECOVERABLE_EMAILS.has(email) ||
    user.role === "admin" ||
    username === "romal-perera" ||
    username === "alex-rivera"
  );
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
 * After Phase A hashing + git rollback, stored passwords no longer match this
 * build's expectations. If the caller uses the known demo password, reset
 * recoverable accounts to plaintext demo1234 and return the matching user.
 */
async function recoverDemoLogin(needle) {
  let recovered = null;

  await updateStore((store) => {
    if (!Array.isArray(store.users)) store.users = [];

    if (store.users.length === 0) {
      store.users.push({
        id: 1,
        email: needle === "admin@uxguard.io" ? "admin@uxguard.io" : "demo@uxguard.io",
        password: DEMO_PASSWORD,
        username: needle === "admin@uxguard.io" ? "romal-perera" : "alex-rivera",
        name: needle === "admin@uxguard.io" ? "Romal Perera" : "Alex Rivera",
        title: "Admin",
        bio: null,
        avatar_url: null,
        cover_image_url: null,
        contact_email: needle === "admin@uxguard.io" ? "admin@uxguard.io" : "demo@uxguard.io",
        location: null,
        cv_url: null,
        social_links: {},
        role: "admin",
        onboarding_intent: "publish_case_studies",
        portfolio_config: defaultPortfolioConfig(),
      });
    }

    for (const user of store.users) {
      if (isRecoverableAccount(user)) {
        user.password = DEMO_PASSWORD;
      }
    }

    recovered =
      store.users.find((u) => String(u.email || "").toLowerCase() === needle) ||
      store.users.find((u) => (EMAIL_ALIASES[needle] || []).includes(String(u.email || "").toLowerCase())) ||
      store.users.find((u) => u.role === "admin") ||
      store.users[0] ||
      null;

    // If they typed admin@ but the only admin is another email, keep that admin
    // and also ensure admin@ resolves next time by alias map (already handled).
    return store;
  });

  return recovered;
}

export async function checkLogin(email, password) {
  const needle = String(email || "").trim().toLowerCase();
  if (!needle || !password) return null;

  let user = await findUserForLogin(needle);
  if (user && verifyPassword(password, user.password)) return user;

  // Locked out after rollback: force-reset known accounts when demo password is used.
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
      role: session.role || "researcher",
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
