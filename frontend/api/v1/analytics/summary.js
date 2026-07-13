import { getAnalyticsSummary } from "../../_lib/analytics.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const summary = await getAnalyticsSummary(user.id);
    res.status(200).json(summary);
  } catch (err) {
    console.error("[analytics/summary]", err);
    res.status(500).json({ detail: err?.message || "Could not load analytics." });
  }
});
