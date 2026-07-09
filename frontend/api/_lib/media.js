import { del, get, put } from "@vercel/blob";
import { readStore, updateStore } from "./store.js";

const MEDIA_PREFIX = "uxguard/media";
const MAX_BYTES = 10 * 1024 * 1024;
const COVER_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function fileExtension(filename, mimeType) {
  const fromName = String(filename || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  if (fromName && fromName.length <= 5) return `.${fromName}`;

  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
  };
  return map[mimeType] || ".bin";
}

export function mediaPublicUrl(assetId) {
  return `/api/v1/media/file/${assetId}`;
}

export function normalizeMediaAssetUrl(url, assetId) {
  if (assetId) return mediaPublicUrl(assetId);
  const match = String(url || "").match(/\/api\/v1\/media\/file\/(\d+)/);
  if (match) return mediaPublicUrl(Number(match[1]));
  return url;
}

export async function listMediaAssets(userId) {
  const store = await readStore();
  return (store.mediaAssets || [])
    .filter((asset) => asset.uploaded_by_id === userId)
    .map((asset) => ({
      ...asset,
      url: normalizeMediaAssetUrl(asset.url, asset.id),
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getMediaAssetById(assetId) {
  const store = await readStore();
  return (store.mediaAssets || []).find((asset) => asset.id === Number(assetId)) || null;
}

export async function uploadMediaAsset(userId, file, altText, purpose = "media") {
  if (!ALLOWED_TYPES.has(file.mimeType)) {
    throw new Error("File type not allowed. Use images, PDF, or Word documents.");
  }

  const isCover = purpose === "cover";
  if (isCover && !file.mimeType.startsWith("image/")) {
    throw new Error("Cover image must be JPG, PNG, or WebP.");
  }

  const maxBytes = isCover ? COVER_MAX_BYTES : MAX_BYTES;
  if (file.buffer.length > maxBytes) {
    throw new Error(isCover ? "Cover image must be 5 MB or smaller" : "File exceeds 10MB limit");
  }

  const ext = fileExtension(file.filename, file.mimeType);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const pathname = `${MEDIA_PREFIX}/${userId}/${unique}${ext}`;

  await put(pathname, file.buffer, {
    access: "private",
    contentType: file.mimeType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  let created = null;

  await updateStore((store) => {
    if (!store.mediaAssets) store.mediaAssets = [];
    const id = store.mediaAssets.reduce((max, asset) => Math.max(max, asset.id), 0) + 1;
    created = {
      id,
      filename: `${unique}${ext}`,
      original_name: file.filename || `${unique}${ext}`,
      mime_type: file.mimeType,
      size_bytes: file.buffer.length,
      pathname,
      url: mediaPublicUrl(id),
      alt_text: altText || null,
      uploaded_by_id: userId,
      created_at: new Date().toISOString(),
    };
    store.mediaAssets.push(created);
    return store;
  });

  return created;
}

export async function deleteMediaAsset(userId, assetId) {
  const asset = await getMediaAssetById(assetId);
  if (!asset) throw new Error("Media not found");
  if (asset.uploaded_by_id !== userId) throw new Error("Forbidden");

  try {
    await del(asset.pathname);
  } catch {
    // Blob may already be gone; still remove metadata.
  }

  await updateStore((store) => {
    store.mediaAssets = (store.mediaAssets || []).filter((item) => item.id !== asset.id);
    return store;
  });
}

export async function streamMediaAsset(assetId) {
  const asset = await getMediaAssetById(assetId);
  if (!asset) return null;

  const result = await get(asset.pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;

  return {
    asset,
    stream: result.stream,
    contentType: result.blob.contentType || asset.mime_type || "application/octet-stream",
  };
}
