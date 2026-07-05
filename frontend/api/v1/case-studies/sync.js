import { syncCaseStudies } from "../../../_lib/demo-data.js";
import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const studies = Array.isArray(req.body?.case_studies) ? req.body.case_studies : req.body;
  if (!Array.isArray(studies)) {
    res.status(400).json({ detail: "Expected an array of case studies" });
    return;
  }

  try {
    const normalized = studies.map((study) => ({ ...study, author_id: user.id }));
    await syncCaseStudies(user.id, normalized);
    res.status(200).json({ synced: normalized.length });
  } catch (err) {
    res.status(500).json({ detail: err.message || "Sync failed" });
  }
});
