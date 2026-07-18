import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { getResumeByIdForUser, assertCanEdit } from "../../../../_lib/resume/service.js";
import { renderResumePdf } from "../../../../_lib/resume/pdf.js";

function parseResumeId(req) {
  const raw = req.query?.id ?? req.query?.param;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery != null && /^\d+$/.test(String(fromQuery))) return Number(fromQuery);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/resumes\/(\d+)\/export\/pdf(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
}

export default withApi(async (req, res) => {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const id = parseResumeId(req);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ detail: "Invalid resume id" });
    return;
  }

  try {
    assertCanEdit(user);
    const resume = await getResumeByIdForUser(id, user.id);
    if (!resume) {
      res.status(404).json({ detail: "Resume not found" });
      return;
    }
    const { buffer, filename, contentType } = await renderResumePdf(resume);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buffer);
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message || "PDF export failed" });
  }
});
