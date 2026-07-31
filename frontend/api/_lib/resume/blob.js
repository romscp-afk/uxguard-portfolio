import { del, get, put } from "@vercel/blob";

const RESUME_PREFIX = "uxguard/resumes";

export function resumeBlobPath(userId, resumeId) {
  return `${RESUME_PREFIX}/${Number(userId)}/${Number(resumeId)}.json`;
}

/** Durable per-resume record so create/import survives platform-store races across instances. */
export async function persistResumeRecord(resume) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !resume?.id || !resume?.user_id) return;
  const payload = JSON.stringify(resume);
  await put(resumeBlobPath(resume.user_id, resume.id), payload, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function loadResumeRecord(resumeId, userId) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const id = Number(resumeId);
  const uid = Number(userId);
  if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(uid) || uid <= 0) return null;

  try {
    const result = await get(resumeBlobPath(uid, id), {
      access: "private",
      headers: { "Cache-Control": "no-cache, no-store", Pragma: "no-cache" },
    });
    if (!result?.stream || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    const resume = JSON.parse(text);
    if (!resume || typeof resume !== "object") return null;
    if (Number(resume.user_id) !== uid || Number(resume.id) !== id) return null;
    if (resume.status === "deleted" || resume.deleted_at) return null;
    return resume;
  } catch {
    return null;
  }
}

export async function deleteResumeRecord(resumeId, userId) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(resumeBlobPath(userId, resumeId));
  } catch {
    // Missing sidecar is fine.
  }
}
