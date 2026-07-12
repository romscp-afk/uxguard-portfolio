import { addComment, listComments } from "../../../_lib/community.js";
import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";

function parseCaseStudyId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export default withApi(async (req, res) => {
  if (req.method === "GET") {
    const caseStudyId = parseCaseStudyId(req.query?.case_study_id);
    if (!caseStudyId) {
      res.status(400).json({ detail: "case_study_id is required" });
      return;
    }
    const comments = await listComments(caseStudyId);
    res.status(200).json(comments);
    return;
  }

  if (req.method === "POST") {
    const user = await requireAuthUser(req, res);
    if (!user) return;

    const caseStudyId = parseCaseStudyId(req.body?.case_study_id);
    const body = req.body?.body;
    if (!caseStudyId) {
      res.status(400).json({ detail: "case_study_id is required" });
      return;
    }

    const result = await addComment(caseStudyId, user.id, body);
    if (result.error) {
      res.status(result.status).json({ detail: result.error });
      return;
    }
    res.status(201).json(result);
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
