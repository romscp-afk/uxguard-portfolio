import { del, get, put } from "@vercel/blob";
import { readStore, updateStore, touchMediaUpdatedAt } from "./store.js";

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
    .filter((asset) => Number(asset.uploaded_by_id) === Number(userId))
    .map((asset) => ({
      ...asset,
      url: normalizeMediaAssetUrl(asset.url, asset.id),
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getMediaAssetById(assetId, options = {}) {
  const store = await readStore(options);
  return (store.mediaAssets || []).find((asset) => Number(asset.id) === Number(assetId)) || null;
}

/**
 * Store is private-only on this deployment — always upload with private access
 * and serve through /api/v1/media/file/:id.
 *
 * Profile purposes (avatar | cover | cv) also attach the URL onto the user row
 * in the same store write so billing races cannot orphan the upload.
 */
export async function uploadMediaAsset(userId, file, altText, purpose = "media") {
  if (!ALLOWED_TYPES.has(file.mimeType)) {
    throw new Error("File type not allowed. Use images, PDF, or Word documents.");
  }

  const isCover = purpose === "cover";
  const isAvatar = purpose === "avatar";
  const isCv = purpose === "cv";
  if ((isCover || isAvatar) && !file.mimeType.startsWith("image/")) {
    throw new Error(isCover ? "Cover image must be JPG, PNG, or WebP." : "Profile photo must be an image.");
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
  const uid = Number(userId);

  await updateStore((store) => {
    if (!store.mediaAssets) store.mediaAssets = [];
    const id = store.mediaAssets.reduce((max, asset) => Math.max(max, Number(asset.id) || 0), 0) + 1;
    created = {
      id,
      filename: `${unique}${ext}`,
      original_name: file.filename || `${unique}${ext}`,
      mime_type: file.mimeType,
      size_bytes: file.buffer.length,
      pathname,
      url: mediaPublicUrl(id),
      alt_text: altText || null,
      uploaded_by_id: uid,
      created_at: new Date().toISOString(),
    };
    store.mediaAssets.push(created);

    if (isAvatar || isCover || isCv) {
      const field = isAvatar ? "avatar_url" : isCover ? "cover_image_url" : "cv_url";
      const index = (store.users || []).findIndex((u) => Number(u.id) === uid);
      if (index !== -1) {
        store.users[index] = touchMediaUpdatedAt(
          {
            ...store.users[index],
            [field]: mediaPublicUrl(id),
          },
          [field],
          created.created_at,
        );
      }
    }

    return store;
  });

  return created;
}

/** Drop profile media URLs that point at missing assets (lost to prior store races). */
export function sanitizeUserMediaFields(user, store) {
  if (!user) return user;
  const assets = store?.mediaAssets || [];
  const hasAsset = (url) => {
    const match = String(url || "").match(/\/api\/v1\/media\/file\/(\d+)/);
    if (!match) return true; // external URLs stay
    return assets.some((asset) => Number(asset.id) === Number(match[1]));
  };

  const next = { ...user };
  let changed = false;
  const now = Date.now();
  for (const field of ["avatar_url", "cover_image_url", "cv_url"]) {
    if (!next[field] || hasAsset(next[field])) continue;
    // Grace period: a just-uploaded asset can be briefly missing on a stale Blob read.
    // Never wipe a brand-new profile photo during that window.
    const touchedAt = Date.parse(String(next.__mediaUpdatedAt?.[field] || ""));
    if (Number.isFinite(touchedAt) && now - touchedAt < 120_000) continue;
    next[field] = null;
    changed = true;
  }
  next.__mediaSanitized = changed;
  return next;
}

/** Persist cleared broken media refs so public profiles stop linking to 404s. */
export async function repairBrokenUserMedia(userId) {
  let repaired = null;
  await updateStore((store) => {
    const uid = Number(userId);
    const index = (store.users || []).findIndex((u) => Number(u.id) === uid);
    if (index === -1) {
      store.__uxguardSkipWrite = true;
      return store;
    }
    const before = store.users[index];
    const cleaned = sanitizeUserMediaFields(before, store);
    if (!cleaned.__mediaSanitized) {
      store.__uxguardSkipWrite = true;
      repaired = cleaned;
      return store;
    }
    const { __mediaSanitized: _flag, ...user } = cleaned;
    const cleared = ["avatar_url", "cover_image_url", "cv_url"].filter(
      (field) => before[field] && !user[field],
    );
    store.users[index] = cleared.length ? touchMediaUpdatedAt(user, cleared) : user;
    repaired = store.users[index];
    return store;
  }, { forceRefresh: true });
  if (repaired) {
    const { __mediaSanitized: _flag, ...user } = repaired;
    return user;
  }
  return null;
}

export async function deleteMediaAsset(userId, assetId) {
  const asset = await getMediaAssetById(assetId, { forceRefresh: true });
  if (!asset) throw new Error("Media not found");
  if (Number(asset.uploaded_by_id) !== Number(userId)) throw new Error("Forbidden");

  try {
    await del(asset.pathname);
  } catch {
    // Blob may already be gone; still remove metadata.
  }

  const id = Number(asset.id);

  // Only remove the asset row + tombstone. Do NOT clear profile fields here —
  // a stale read can still show the old URL and would wipe a newer replacement
  // with a fresher clear timestamp.
  await updateStore((store) => {
    store.mediaAssets = (store.mediaAssets || []).filter((item) => Number(item.id) !== id);
    store.__uxguardDeleted = {
      ...(store.__uxguardDeleted || {}),
      mediaAssets: [...new Set([...(store.__uxguardDeleted?.mediaAssets || []), id])],
    };
    return store;
  }, { forceRefresh: true });
}

export async function streamMediaAsset(assetId) {
  const asset = await getMediaAssetById(assetId, { forceRefresh: true });
  if (!asset?.pathname) return null;

  // Blob get can lag briefly after put — same class of bug as profile image saves.
  let result = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    result = await get(asset.pathname, { access: "private", useCache: attempt === 0 });
    if (result && result.statusCode === 200 && result.stream) break;
    result = null;
    await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
  }
  if (!result) return null;

  return {
    asset,
    stream: result.stream,
    contentType: result.blob?.contentType || asset.mime_type || "application/octet-stream",
  };
}
