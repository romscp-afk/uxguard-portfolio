import { requireAuthUser } from "../../_lib/auth.js";
import { isAdmin } from "../../_lib/roles.js";
import { withApi } from "../../_lib/withApi.js";
import { listUxAudits } from "../../_lib/ux-audit/store.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) {
    res.status(403).json({ detail: "Admin access required." });
    return;
  }

  if (req.method === "GET") {
    const q = String(req.query?.q || "");
    const status = req.query?.status ? String(req.query.status) : undefined;
    const audits = await listUxAudits({ q, status });
    res.status(200).json({
      audits: audits.map((a) => ({
        id: a.id,
        access_token: a.access_token,
        website_url: a.website_url,
        normalized_url: a.normalized_url,
        company_name: a.company_name,
        status: a.status,
        overall_score: a.overall_score,
        growth_opportunity: a.growth_opportunity,
        submitted_at: a.submitted_at,
        completed_at: a.completed_at,
        lead_status: a.lead_status,
        lead: a.lead,
        failure_reason: a.failure_reason,
        summary: a.summary,
      })),
    });
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
