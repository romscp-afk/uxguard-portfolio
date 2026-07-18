import { getAuthUser, requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../_lib/hiring/http.js";
import {
  getJobForEmployer,
  getPublicJob,
  reportJob,
  transitionJob,
  updateJob,
} from "../../../_lib/hiring/jobs.js";
import { trackHiringEvent } from "../../../_lib/hiring/analytics.js";
import { matchResumeToJob } from "../../../_lib/hiring/applications.js";

export default withApi(async (req, res) => {
  const jobId = idFrom(req, ["jobId", "id"], /\/jobs\/([^/?#]+)/);
  if (!jobId) {
    res.status(400).json({ detail: "job id required" });
    return;
  }

  if (req.method === "GET") {
    const user = await getAuthUser(req);
    // Employers with access get full job; others get public view
    if (user) {
      try {
        const job = await getJobForEmployer(jobId, user);
        if (job) {
          res.status(200).json({ job, view: "employer" });
          return;
        }
      } catch {
        // fall through to public
      }
    }
    const job = await getPublicJob(jobId, user?.id || null);
    if (!job) {
      res.status(404).json({ detail: "Job not found" });
      return;
    }
    if (user) await trackHiringEvent("job_viewed", user.id, { job_id: Number(jobId) });
    res.status(200).json({ job, view: "public" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "PATCH") {
    try {
      const job = await updateJob(jobId, user, await readBody(req));
      res.status(200).json({ job });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    const action = body.action;
    try {
      if (action === "match") {
        const match = await matchResumeToJob(jobId, user.id, body.resume_id);
        res.status(200).json({ match });
        return;
      }
      if (action === "report") {
        const report = await reportJob(jobId, user, body);
        res.status(201).json({ report });
        return;
      }
      if (
        ["publish", "pause", "close", "submit_review", "schedule", "archive", "reopen"].includes(
          action,
        )
      ) {
        const job = await transitionJob(jobId, user, action, body);
        res.status(200).json({ job });
        return;
      }
      res.status(400).json({ detail: "Unknown action" });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
