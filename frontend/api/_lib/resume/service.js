import { readStore, updateStore } from "../store.js";
import { assertCanEdit } from "../projects.js";
import {
  createBlankResume,
  normalizeResume,
  toResumeSummary,
} from "./schema.js";
import { extractResumeText, assertResumeUploadType } from "./extract.js";
import { structureResumeWithAi } from "./parse.js";
import { uploadMediaAsset } from "../media.js";

function nextResumeId(resumes) {
  return (resumes || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function isOwnedActive(item, userId) {
  return (
    Number(item.user_id) === Number(userId) &&
    item.status !== "deleted" &&
    !item.deleted_at
  );
}

export async function listResumesForUser(userId, { includeArchived = true } = {}) {
  const store = await readStore();
  return (store.resumes || [])
    .filter((item) => isOwnedActive(item, userId))
    .filter((item) => (includeArchived ? true : item.status !== "archived"))
    .map((item) => normalizeResume(item, userId))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .map(toResumeSummary);
}

export async function getResumeByIdForUser(resumeId, userId) {
  const store = await readStore();
  const resume = (store.resumes || []).find(
    (item) =>
      Number(item.id) === Number(resumeId) &&
      Number(item.user_id) === Number(userId) &&
      item.status !== "deleted" &&
      !item.deleted_at,
  );
  return resume ? normalizeResume(resume, userId) : null;
}

/** Backward compatible: most recently updated non-deleted resume. */
export async function getResumeForUser(userId) {
  const store = await readStore();
  const resumes = (store.resumes || [])
    .filter((item) => isOwnedActive(item, userId))
    .map((item) => normalizeResume(item, userId))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return resumes[0] || null;
}

async function writeResume(userId, payload, { existingId = null } = {}) {
  const uid = Number(userId);
  let saved = null;

  await updateStore(
    (store) => {
      if (!store.resumes) store.resumes = [];
      const now = new Date().toISOString();
      const existing = existingId
        ? store.resumes.find(
            (item) => Number(item.id) === Number(existingId) && Number(item.user_id) === uid,
          )
        : null;

      if (existingId && !existing) {
        const err = new Error("Resume not found");
        err.status = 404;
        throw err;
      }
      if (existing?.deleted_at || existing?.status === "deleted") {
        const err = new Error("Resume not found");
        err.status = 404;
        throw err;
      }

      const normalized = normalizeResume(
        {
          ...(existing || {}),
          ...(payload || {}),
          id: existing?.id || nextResumeId(store.resumes),
          user_id: uid,
          created_at: existing?.created_at || now,
          updated_at: now,
          deleted_at:
            payload?.deleted_at !== undefined ? payload.deleted_at : existing?.deleted_at ?? null,
          source_media_id:
            payload?.source_media_id !== undefined
              ? payload.source_media_id
              : existing?.source_media_id ?? null,
          source_filename:
            payload?.source_filename !== undefined
              ? payload.source_filename
              : existing?.source_filename ?? null,
          source_mime:
            payload?.source_mime !== undefined
              ? payload.source_mime
              : existing?.source_mime ?? null,
          parsed_at:
            payload?.parsed_at !== undefined ? payload.parsed_at : existing?.parsed_at ?? null,
          parse_status:
            payload?.parse_status !== undefined
              ? payload.parse_status
              : existing?.parse_status || "none",
          parse_error:
            payload?.parse_error !== undefined
              ? payload.parse_error
              : existing?.parse_error ?? null,
        },
        uid,
      );

      if (existing) {
        store.resumes = store.resumes.map((item) =>
          Number(item.id) === Number(existing.id) ? normalized : item,
        );
      } else {
        store.resumes.push(normalized);
      }
      saved = normalized;
      return store;
    },
    { forceRefresh: true },
  );

  return saved;
}

export async function createResumeForUser(userId, payload = {}) {
  const blank = createBlankResume(userId, {
    title: payload.title || "My Resume",
    target_role: payload.target_role || "",
    target_company: payload.target_company || "",
    target_industry: payload.target_industry || "",
    target_country: payload.target_country || "",
    experience_level: payload.experience_level || "mid",
    creation_method: payload.creation_method || "manual",
    basics: payload.basics || {},
  });
  return writeResume(userId, blank);
}

export async function updateResumeForUser(resumeId, userId, payload = {}) {
  return writeResume(userId, payload, { existingId: resumeId });
}

/** Legacy single-resume upsert — updates newest or creates one. Prefer create/update by id. */
export async function saveResumeForUser(userId, payload) {
  const existing = await getResumeForUser(userId);
  if (existing) {
    return writeResume(userId, payload, { existingId: existing.id });
  }
  return writeResume(userId, {
    ...createBlankResume(userId),
    ...(payload || {}),
  });
}

export async function createBlankResumeForUser(userId, payload = {}) {
  return createResumeForUser(userId, {
    creation_method: "manual",
    ...payload,
  });
}

export async function softDeleteResumeForUser(resumeId, userId) {
  const existing = await getResumeByIdForUser(resumeId, userId);
  if (!existing) {
    const err = new Error("Resume not found");
    err.status = 404;
    throw err;
  }
  const now = new Date().toISOString();
  return writeResume(
    userId,
    {
      ...existing,
      status: "deleted",
      deleted_at: now,
    },
    { existingId: resumeId },
  );
}

export async function archiveResumeForUser(resumeId, userId) {
  const existing = await getResumeByIdForUser(resumeId, userId);
  if (!existing) {
    const err = new Error("Resume not found");
    err.status = 404;
    throw err;
  }
  return writeResume(
    userId,
    { ...existing, status: existing.status === "archived" ? "draft" : "archived" },
    { existingId: resumeId },
  );
}

export async function duplicateResumeForUser(resumeId, userId, overrides = {}) {
  const existing = await getResumeByIdForUser(resumeId, userId);
  if (!existing) {
    const err = new Error("Resume not found");
    err.status = 404;
    throw err;
  }
  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, ...rest } = existing;
  return createResumeForUser(userId, {
    ...rest,
    title: overrides.title || `${existing.title} (Copy)`,
    status: "draft",
    creation_method: existing.creation_method || "manual",
    ...overrides,
  });
}

export async function renameResumeForUser(resumeId, userId, title) {
  const existing = await getResumeByIdForUser(resumeId, userId);
  if (!existing) {
    const err = new Error("Resume not found");
    err.status = 404;
    throw err;
  }
  const nextTitle = String(title || "").trim();
  if (!nextTitle) {
    const err = new Error("Resume name is required");
    err.status = 400;
    throw err;
  }
  return writeResume(userId, { ...existing, title: nextTitle }, { existingId: resumeId });
}

export async function importResumeForUser(userId, file, meta = {}) {
  assertResumeUploadType(file.mimeType, file.filename);

  const asset = await uploadMediaAsset(userId, file, "Resume upload", "cv");
  const base = createBlankResume(userId, {
    title: meta.title || "Imported Resume",
    target_role: meta.target_role || "",
    target_industry: meta.target_industry || "",
    target_country: meta.target_country || "",
    experience_level: meta.experience_level || "mid",
    creation_method: "upload",
    status: "draft",
  });

  let extracted = "";
  try {
    extracted = await extractResumeText({
      buffer: file.buffer,
      mimeType: file.mimeType,
      filename: file.filename,
    });
  } catch (err) {
    const failed = await writeResume(userId, {
      ...base,
      source_media_id: asset.id,
      source_filename: asset.original_name || file.filename,
      source_mime: file.mimeType,
      parse_status: "failed",
      parse_error: err.message || "Could not extract text",
      parsed_at: new Date().toISOString(),
    });
    return {
      resume: failed,
      ai_used: false,
      credits_used: 0,
      message: err.message || "Could not extract text from this file.",
    };
  }

  let structured;
  try {
    structured = await structureResumeWithAi({
      userId,
      resumeText: extracted,
      existingResume: {
        ...base,
        source_media_id: asset.id,
        source_filename: asset.original_name || file.filename,
        source_mime: file.mimeType,
      },
    });
  } catch (err) {
    const failed = await writeResume(userId, {
      ...base,
      source_media_id: asset.id,
      source_filename: asset.original_name || file.filename,
      source_mime: file.mimeType,
      parse_status: "failed",
      parse_error: err.message || "AI parse failed",
      parsed_at: new Date().toISOString(),
    });
    if (err.status === 402) {
      return {
        resume: failed,
        ai_used: false,
        credits_used: 0,
        message: err.message || "Not enough AI credits to parse this resume.",
      };
    }
    return {
      resume: failed,
      ai_used: false,
      credits_used: 0,
      message: err.message || "Could not structure resume details.",
    };
  }

  const saved = await writeResume(userId, {
    ...structured.resume,
    title: meta.title || structured.resume.title || "Imported Resume",
    target_role: meta.target_role || structured.resume.target_role || "",
    creation_method: "upload",
    source_media_id: asset.id,
    source_filename: asset.original_name || file.filename,
    source_mime: file.mimeType,
    parse_status: "ready",
    parse_error: structured.ai_used ? null : structured.message || null,
    parsed_at: new Date().toISOString(),
  });

  return {
    resume: saved,
    ai_used: structured.ai_used,
    credits_used: structured.credits_used || 0,
    message: structured.message,
  };
}

export { assertCanEdit };
