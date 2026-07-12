import { addComment, listComments } from "../../_lib/community.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

function parseCaseStudyId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default withApi(async (req, res) => {
  if (req.method === "GET") {
    const caseStudyId = parseCaseStudyId(req.query?.case_study_id);
    if (!caseStudyId) {
      res.status(400).json({ detail: "case_study_id is required" });
      return;
    }
    const comments = await listComments(caseStudyId);
    res.status(200).json(Array.isArray(comments) ? comments : []);
    return;
  }

  if (req.method === "POST") {
    const user = await requireAuthUser(req, res);
    if (!user) return;

    const payload = await readBody(req);
    const caseStudyId = parseCaseStudyId(payload?.case_study_id);
    const body = payload?.body;
    if (!caseStudyId) {
      res.status(400).json({ detail: "case_study_id is required" });
      return;
    }

    const result = await addComment(caseStudyId, user.id, body);
    if (result.error) {
      res.status(result.status || 400).json({ detail: result.error });
      return;
    }
    res.status(201).json(result);
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
