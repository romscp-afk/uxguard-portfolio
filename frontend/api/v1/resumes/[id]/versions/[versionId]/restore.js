import { requireAuthUser } from "../../../../../_lib/auth.js";
import { withApi } from "../../../../../_lib/withApi.js";
import { assertCanEdit, restoreResumeVersionForUser } from "../../../../../_lib/resume/service.js";

function parseIds(req) {
  const resumeRaw = req.query?.id ?? req.query?.param;
  const versionRaw = req.query?.versionId ?? req.query?.version_id;
  let resumeId = Array.isArray(resumeRaw) ? resumeRaw[0] : resumeRaw;
  let versionId = Array.isArray(versionRaw) ? versionRaw[0] : versionRaw;

  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/resumes\/(\d+)\/versions\/([^/]+)\/restore(?:\/)?$/);
  if (match) {
    resumeId = match[1];
    versionId = decodeURIComponent(match[2]);
  }
  return {
    resumeId: Number(resumeId),
    versionId: versionId ? String(versionId) : "",
  };
}

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const { resumeId, versionId } = parseIds(req);
  if (!Number.isFinite(resumeId) || resumeId <= 0 || !versionId) {
    res.status(400).json({ detail: "Invalid resume or version id" });
    return;
  }
  try {
    assertCanEdit(user);
    const resume = await restoreResumeVersionForUser(resumeId, versionId, user.id);
    res.status(200).json({ resume });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message || "Failed to restore version" });
  }
});
