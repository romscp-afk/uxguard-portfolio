import {
  getLikeStats,
  likeCaseStudy,
  unlikeCaseStudy,
} from "../../_lib/community.js";
import { getAuthUser, requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

function parseCaseStudyId(req) {
  const raw = req.query?.case_study_id ?? req.query?.id ?? req.body?.case_study_id;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value != null && /^\d+$/.test(String(value))) return Number(value);
  return NaN;
}

export default withApi(async (req, res) => {
  const caseStudyId = parseCaseStudyId(req);
  if (!Number.isFinite(caseStudyId) || caseStudyId <= 0) {
    res.status(400).json({ detail: "case_study_id is required" });
    return;
  }

  if (req.method === "GET") {
    const session = await getAuthUser(req);
    const stats = await getLikeStats(caseStudyId, session?.id ?? null);
    res.status(200).json(stats);
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "POST") {
    const result = await likeCaseStudy(user.id, caseStudyId);
    if (result.error) {
      res.status(result.status).json({ detail: result.error });
      return;
    }
    res.status(200).json(result);
    return;
  }

  if (req.method === "DELETE") {
    const result = await unlikeCaseStudy(user.id, caseStudyId);
    res.status(200).json(result);
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
