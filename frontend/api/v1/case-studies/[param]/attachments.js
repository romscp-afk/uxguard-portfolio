import { addCaseStudyAttachment } from "../../../_lib/demo-data.js";
import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const caseId = Number(req.query.param);
  if (!caseId) {
    res.status(400).json({ detail: "Invalid case study id" });
    return;
  }

  const { title, file_url, file_type, size_bytes } = req.query;
  if (!file_url) {
    res.status(400).json({ detail: "file_url is required" });
    return;
  }

  try {
    const attachment = await addCaseStudyAttachment(caseId, user.id, {
      title: title || "Research report",
      file_url,
      file_type: file_type || "application/octet-stream",
      size_bytes: Number(size_bytes) || 0,
    });
    res.status(200).json(attachment);
  } catch (err) {
    const status = err.message === "Case study not found" ? 404 : 400;
    res.status(status).json({ detail: err.message });
  }
});
