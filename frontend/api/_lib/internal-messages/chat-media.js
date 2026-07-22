import { get, put } from "@vercel/blob";

const CHAT_PREFIX = "uxguard/chat";
const MAX_BYTES = 500 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fileExtension(filename, mimeType) {
  const fromName = String(filename || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return `.${fromName === "jpeg" ? "jpg" : fromName}`;
  }
  const map = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  return map[mimeType] || ".jpg";
}

export function encodeChatPathToken(pathname) {
  return Buffer.from(String(pathname), "utf8").toString("base64url");
}

export function decodeChatPathToken(token) {
  try {
    const pathname = Buffer.from(String(token || ""), "base64url").toString("utf8");
    if (!pathname.startsWith(`${CHAT_PREFIX}/`)) return null;
    if (pathname.includes("..") || pathname.includes("\\")) return null;
    return pathname;
  } catch {
    return null;
  }
}

export function chatFilePublicUrl(pathname) {
  return `/api/v1/internal-messages/file/${encodeChatPathToken(pathname)}`;
}

/**
 * Store chat images on a dedicated Blob path (not mediaAssets).
 * Avoids the same store-merge races that broke profile/cover image saves.
 */
export async function uploadChatImage(userId, file) {
  const mimeType = String(file.mimeType || "").toLowerCase();
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error("Only JPG, PNG, WebP, or GIF images can be shared in chat.");
  }
  if (!file.buffer?.length) {
    throw new Error("Empty file.");
  }
  if (file.buffer.length > MAX_BYTES) {
    throw new Error("Images must be 500 KB or smaller after compression.");
  }

  const ext = fileExtension(file.filename, mimeType);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const pathname = `${CHAT_PREFIX}/${Number(userId)}/${unique}${ext}`;

  await put(pathname, file.buffer, {
    access: "private",
    contentType: mimeType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  // Blob list/get can lag briefly after put — verify before returning a URL.
  const verified = await streamChatImage(pathname, { retries: 6 });
  if (!verified) {
    throw new Error("Image uploaded but is not readable yet. Please try again.");
  }

  return {
    url: chatFilePublicUrl(pathname),
    pathname,
    mime_type: mimeType,
    size_bytes: file.buffer.length,
    name: file.filename || `${unique}${ext}`,
  };
}

export async function streamChatImage(pathname, { retries = 5 } = {}) {
  const safePath = decodeChatPathToken(encodeChatPathToken(pathname)) || pathname;
  if (!String(safePath).startsWith(`${CHAT_PREFIX}/`)) return null;

  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await get(safePath, { access: "private", useCache: attempt === 0 });
      if (result && result.statusCode === 200 && result.stream) {
        return {
          stream: result.stream,
          contentType: result.blob?.contentType || "image/jpeg",
          pathname: safePath,
        };
      }
    } catch (err) {
      lastError = err;
    }
    await sleep(60 * (attempt + 1));
  }
  if (lastError) {
    console.warn("[chat-media] stream failed", safePath, lastError.message || lastError);
  }
  return null;
}
