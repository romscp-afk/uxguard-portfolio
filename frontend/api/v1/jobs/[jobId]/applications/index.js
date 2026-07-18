import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/hiring/http.js";
import { applyToJob } from "../../../../_lib/hiring/applications.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const jobId = idFrom(req, ["jobId", "id"], /\/jobs\/([^/?#]+)\/applications/);
  try {
    const application = await applyToJob(jobId, user, await readBody(req));
    res.status(201).json({ application });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message });
  }
});
