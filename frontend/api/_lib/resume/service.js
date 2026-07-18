import { readStore, updateStore } from "../store.js";
import { createBlankResume, normalizeResume } from "./schema.js";
import { extractResumeText, assertResumeUploadType } from "./extract.js";
import { structureResumeWithAi } from "./parse.js";
import { uploadMediaAsset } from "../media.js";

function nextResumeId(resumes) {
  return (resumes || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

export async function getResumeForUser(userId) {
  const store = await readStore();
  const resume = (store.resumes || []).find((item) => Number(item.user_id) === Number(userId));
  return resume ? normalizeResume(resume, userId) : null;
}

export async function saveResumeForUser(userId, payload) {
  const uid = Number(userId);
  let saved = null;

  await updateStore((store) => {
    if (!store.resumes) store.resumes = [];
    const existing = store.resumes.find((item) => Number(item.user_id) === uid);
    const now = new Date().toISOString();
    const normalized = normalizeResume(
      {
        ...(existing || {}),
        ...(payload || {}),
        id: existing?.id || nextResumeId(store.resumes),
        user_id: uid,
        created_at: existing?.created_at || now,
        updated_at: now,
        // Preserve source metadata unless explicitly provided
        source_media_id:
          payload?.source_media_id !== undefined
            ? payload.source_media_id
            : existing?.source_media_id ?? null,
        source_filename:
          payload?.source_filename !== undefined
            ? payload.source_filename
            : existing?.source_filename ?? null,
        source_mime:
          payload?.source_mime !== undefined ? payload.source_mime : existing?.source_mime ?? null,
        parsed_at:
          payload?.parsed_at !== undefined ? payload.parsed_at : existing?.parsed_at ?? null,
        parse_status:
          payload?.parse_status !== undefined
            ? payload.parse_status
            : existing?.parse_status || "none",
        parse_error:
          payload?.parse_error !== undefined ? payload.parse_error : existing?.parse_error ?? null,
      },
      uid,
    );

    if (existing) {
      store.resumes = store.resumes.map((item) =>
        Number(item.user_id) === uid ? normalized : item,
      );
    } else {
      store.resumes.push(normalized);
    }
    saved = normalized;
    return store;
  }, { forceRefresh: true });

  return saved;
}

export async function createBlankResumeForUser(userId) {
  const existing = await getResumeForUser(userId);
  if (existing) return existing;
  return saveResumeForUser(userId, createBlankResume(userId));
}

export async function importResumeForUser(userId, file) {
  assertResumeUploadType(file.mimeType, file.filename);

  const asset = await uploadMediaAsset(userId, file, "Resume upload", "cv");
  const base =
    (await getResumeForUser(userId)) ||
    createBlankResume(userId, {
      title: "My Resume",
    });

  let extracted = "";
  try {
    extracted = await extractResumeText({
      buffer: file.buffer,
      mimeType: file.mimeType,
      filename: file.filename,
    });
  } catch (err) {
    const failed = await saveResumeForUser(userId, {
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
    const failed = await saveResumeForUser(userId, {
      ...base,
      source_media_id: asset.id,
      source_filename: asset.original_name || file.filename,
      source_mime: file.mimeType,
      parse_status: "failed",
      parse_error: err.message || "AI parse failed",
      parsed_at: new Date().toISOString(),
    });
    const status = err.status || 500;
    if (status === 402) {
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

  const saved = await saveResumeForUser(userId, {
    ...structured.resume,
    source_media_id: asset.id,
    source_filename: asset.original_name || file.filename,
    source_mime: file.mimeType,
    parse_status: structured.ai_used ? "ready" : "ready",
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
