import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PREFIX = "scrypt";

/** Hash a password for storage. */
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `${PREFIX}$${salt}$${hash}`;
}

/**
 * Verify password against stored hash or legacy plaintext.
 * Production data may still hold scrypt hashes from Phase A while this build
 * otherwise uses plaintext seeds — support both so login keeps working.
 */
export function verifyPassword(password, stored) {
  if (!stored) return false;
  const value = String(stored);
  if (!value.startsWith(`${PREFIX}$`)) {
    return value === String(password);
  }
  const parts = value.split("$");
  if (parts.length !== 3) return false;
  const [, salt, hash] = parts;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(String(password), salt, 64);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function isHashedPassword(stored) {
  return String(stored || "").startsWith(`${PREFIX}$`);
}
