import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { assertCandidateWorkspace } from "../../../_lib/roles.js";
import { getCareerInsights } from "../../../_lib/career/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    assertCandidateWorkspace(user);
  } catch (err) {
    res.status(err.status || 403).json({ detail: err.message });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const data = await getCareerInsights(user.id);
  res.status(200).json(data);
});
