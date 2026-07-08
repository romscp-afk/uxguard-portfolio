import { deleteComment } from "../../_lib/community.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const id = Number(req.query.id);
  if (!id) {
    res.status(400).json({ detail: "Comment id is required" });
    return;
  }

  try {
    await deleteComment(id, user.id);
    res.status(204).end();
  } catch (err) {
    const status = err.message === "Forbidden" ? 403 : err.message === "Comment not found" ? 404 : 400;
    res.status(status).json({ detail: err.message });
  }
});
