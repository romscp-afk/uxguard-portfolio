import {
  deleteCaseStudy,
  getCaseStudyByIdForAuthor,
  getCaseStudyBySlug,
  updateCaseStudy,
} from "../../_lib/demo-data.js";
import { notifyNewPublication } from "../../_lib/community.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { assertCanEdit } from "../../_lib/projects.js";
import { withApi } from "../../_lib/withApi.js";

async function maybeNotifyPublish(previous, updated, author) {
  const wasPublished = previous?.status === "published";
  const isPublished = updated?.status === "published";
  if (!wasPublished && isPublished) {
    await notifyNewPublication(updated, author);
  }
}

export default withApi(async (req, res) => {
  const param = String(req.query.param || "");

  if (/^\d+$/.test(param)) {
    const id = Number(param);
    const user = await requireAuthUser(req, res);
    if (!user) return;

    if (req.method === "PATCH") {
      try {
        assertCanEdit(user);
        const previous = await getCaseStudyByIdForAuthor(id, user.id);
        const updated = await updateCaseStudy(id, user.id, req.body || {});
        await maybeNotifyPublish(previous, updated, user);
        res.status(200).json(updated);
      } catch (err) {
        const status = err.message === "Forbidden" ? 403 : err.message === "Case study not found" ? 404 : 400;
        res.status(status).json({ detail: err.message });
      }
      return;
    }

    if (req.method === "DELETE") {
      try {
        assertCanEdit(user);
        await deleteCaseStudy(id, user.id);
        res.status(204).end();
      } catch (err) {
        const status = err.message === "Forbidden" ? 403 : 404;
        res.status(status).json({ detail: err.message });
      }
      return;
    }

    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const cs = await getCaseStudyBySlug(param);
  if (!cs) {
    res.status(404).json({ detail: "Case study not found" });
    return;
  }
  res.status(200).json(cs);
});
