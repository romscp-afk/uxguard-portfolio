import { deleteCaseStudyAttachment } from "../../../_lib/demo-data.js";
import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const attachmentId = Number(req.query.id);
  if (!attachmentId) {
    res.status(400).json({ detail: "Invalid attachment id" });
    return;
  }

  try {
    await deleteCaseStudyAttachment(attachmentId, user.id);
    res.status(204).end();
  } catch (err) {
    const status = err.message === "Attachment not found" ? 404 : 400;
    res.status(status).json({ detail: err.message });
  }
});
