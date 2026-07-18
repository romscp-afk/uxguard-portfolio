import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { listCandidateApplications } from "../../../_lib/hiring/applications.js";
import { listSavedJobs } from "../../../_lib/hiring/jobs.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const applications = await listCandidateApplications(user.id);
  res.status(200).json({ applications });
});
