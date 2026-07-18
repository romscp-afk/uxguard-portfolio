import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom } from "../../../../_lib/hiring/http.js";
import { saveJob, unsaveJob } from "../../../../_lib/hiring/jobs.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const jobId = idFrom(req, ["jobId", "id"], /\/jobs\/([^/?#]+)\/save/);

  if (req.method === "POST") {
    try {
      const saved = await saveJob(jobId, user.id);
      res.status(200).json({ saved });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await unsaveJob(jobId, user.id);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
