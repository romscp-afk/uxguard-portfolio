import { requireAuthUser } from "../../../../../_lib/auth.js";
import { withApi } from "../../../../../_lib/withApi.js";
import { idFrom } from "../../../../../_lib/hiring/http.js";
import { listEmployerApplications } from "../../../../../_lib/hiring/applications.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const jobId = idFrom(req, ["jobId", "id"], /\/employer\/jobs\/([^/?#]+)\/applications/);
  try {
    const applications = await listEmployerApplications(jobId, user, req.query || {});
    res.status(200).json({ applications });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
