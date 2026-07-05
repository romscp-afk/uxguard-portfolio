import { createHmac } from "node:crypto";
import { getUserByEmail, getUserById } from "./demo-data.js";

const JWT_SECRET = process.env.JWT_SECRET || "uxguard-vercel-demo-secret";

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

export async function checkLogin(email, password) {
  const user = await getUserByEmail(email);
  return user && user.password === password ? user : null;
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
