import {
  getLikeStats,
  likeCaseStudy,
  unlikeCaseStudy,
} from "../../../_lib/community.js";
import { getAuthUser, requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";

/** Nested route — /api/v1/case-studies/:id/like */
function parseCaseStudyId(req) {
  const fromQuery = req.query?.param ?? req.query?.id;
  const value = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (value != null && /^\d+$/.test(String(value))) return Number(value);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/case-studies\/(\d+)\/like(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
}

export default withApi(async (req, res) => {
  const caseStudyId = parseCaseStudyId(req);
  if (!Number.isFinite(caseStudyId) || caseStudyId <= 0) {
    res.status(400).json({ detail: "Invalid case study id" });
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
