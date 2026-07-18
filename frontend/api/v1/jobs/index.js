import { getAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import { searchJobs } from "../../_lib/hiring/jobs.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const user = await getAuthUser(req);
  const result = await searchJobs(req.query || {}, user?.id || null);
  res.status(200).json(result);
});
