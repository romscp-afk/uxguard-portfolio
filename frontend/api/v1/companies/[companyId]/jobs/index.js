import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/hiring/http.js";
import { createJob, listCompanyJobs } from "../../../../_lib/hiring/jobs.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const companyId = idFrom(req, ["companyId", "id"], /\/companies\/([^/?#]+)\/jobs/);

  if (req.method === "GET") {
    try {
      const jobs = await listCompanyJobs(companyId, user);
      res.status(200).json({ jobs });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const job = await createJob(companyId, user, await readBody(req));
      res.status(201).json({ job });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
