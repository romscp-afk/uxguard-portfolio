import { requireAuthUser } from "../_lib/auth.js";
import { getCreditsSummary } from "../_lib/ai/generate.js";
import { withApi } from "../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    const summary = await getCreditsSummary(user.id);
    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ detail: "Could not load AI credits." });
  }
});
