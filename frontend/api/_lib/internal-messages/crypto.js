import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  const secret =
    process.env.INTERNAL_MESSAGE_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.NODE_ENV === "production" ? "" : "uxguard-local-messages-only");
  if (!secret) {
    const error = new Error(
      "Private messaging encryption is not configured. Set INTERNAL_MESSAGE_ENCRYPTION_KEY.",
    );
    error.status = 503;
    error.code = "INTERNAL_MESSAGE_ENCRYPTION_NOT_CONFIGURED";
    throw error;
  }
  return createHash("sha256").update(String(secret)).digest();
}

export function encryptInternalText(value, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(Buffer.from(String(context)));
  const encrypted = Buffer.concat([
    cipher.update(String(value || ""), "utf8"),
    cipher.final(),
  ]);
  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptInternalText(payload, context) {
  if (!payload || typeof payload !== "object") return "";
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(payload.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(String(context)));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    const error = new Error("This private message could not be decrypted.");
    error.status = 500;
    error.code = "INTERNAL_MESSAGE_DECRYPT_FAILED";
    throw error;
  }
}
