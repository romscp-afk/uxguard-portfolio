import { createHash, randomBytes } from "node:crypto";
import { getUserByEmail } from "./demo-data.js";
import { sendPasswordResetEmail } from "./mail.js";
import { readStore, updateStore } from "./store.js";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:5173"
  );
}

function pruneExpiredTokens(tokens) {
  const now = Date.now();
  return (tokens || []).filter((entry) => {
    if (entry.used_at) return false;
    return new Date(entry.expires_at).getTime() > now;
  });
}

export async function requestPasswordReset(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return { error: "Email is required", status: 400 };
  }

  const user = await getUserByEmail(normalizedEmail);

  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    await updateStore((store) => {
      if (!store.passwordResetTokens) store.passwordResetTokens = [];
      store.passwordResetTokens = pruneExpiredTokens(store.passwordResetTokens);
      store.passwordResetTokens.push({
        token_hash: tokenHash,
        user_id: user.id,
        email: normalizedEmail,
        expires_at: expiresAt,
        used_at: null,
        created_at: new Date().toISOString(),
      });
      return store;
    });

    const resetUrl = `${appBaseUrl()}/admin/reset-password?token=${token}`;
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      userName: user.name,
    });
  }

  return {
    message:
      "If an account exists for that email, we sent a password reset link. Check your inbox (and spam folder).",
  };
}

export async function verifyPasswordResetToken(token) {
  if (!token) return { valid: false, error: "Reset link is invalid or expired." };

  const tokenHash = hashToken(token);
  const store = await readStore();
  const entry = (store.passwordResetTokens || []).find(
    (item) => item.token_hash === tokenHash && !item.used_at,
  );

  if (!entry) return { valid: false, error: "Reset link is invalid or expired." };
  if (new Date(entry.expires_at).getTime() < Date.now()) {
    return { valid: false, error: "Reset link has expired. Request a new one." };
  }

  return { valid: true, email: entry.email };
}

export async function completePasswordReset(token, newPassword) {
  if (!token || !newPassword) {
    return { error: "Reset token and new password are required", status: 400 };
  }
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters", status: 400 };
  }

  const tokenHash = hashToken(token);
  let updated = false;

  await updateStore((store) => {
    if (!store.passwordResetTokens) store.passwordResetTokens = [];

    const entryIndex = store.passwordResetTokens.findIndex(
      (item) => item.token_hash === tokenHash && !item.used_at,
    );
    if (entryIndex === -1) return store;

    const entry = store.passwordResetTokens[entryIndex];
    if (new Date(entry.expires_at).getTime() < Date.now()) return store;

    const userIndex = store.users.findIndex((u) => u.id === entry.user_id);
    if (userIndex === -1) return store;

    store.users[userIndex] = { ...store.users[userIndex], password: newPassword };
    store.passwordResetTokens[entryIndex] = {
      ...entry,
      used_at: new Date().toISOString(),
    };
    updated = true;
    return store;
  });

  if (!updated) {
    return { error: "Reset link is invalid or expired", status: 400 };
  }

  return { message: "Password updated. You can sign in with your new password." };
}
