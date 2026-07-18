import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../_lib/hiring/http.js";
import {
  addApplicationNote,
  assignApplication,
  getCandidateApplication,
  getEmployerApplication,
  updateApplicationStage,
  withdrawApplication,
} from "../../../_lib/hiring/applications.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  const applicationId = idFrom(req, ["applicationId", "id"], /\/applications\/([^/?#]+)/);

  if (req.method === "GET") {
    const asCandidate = await getCandidateApplication(applicationId, user.id);
    if (asCandidate) {
      res.status(200).json({ ...asCandidate, view: "candidate" });
      return;
    }
    try {
      const asEmployer = await getEmployerApplication(applicationId, user);
      if (!asEmployer) {
        res.status(404).json({ detail: "Application not found" });
        return;
      }
      res.status(200).json({ ...asEmployer, view: "employer" });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    try {
      if (body.action === "withdraw") {
        const application = await withdrawApplication(applicationId, user.id);
        res.status(200).json({ application });
        return;
      }
      if (body.action === "note") {
        const note = await addApplicationNote(applicationId, user, body.note);
        res.status(201).json({ note });
        return;
      }
      if (body.action === "assign") {
        const application = await assignApplication(applicationId, user, body.member_id);
        res.status(200).json({ application });
        return;
      }
      res.status(400).json({ detail: "Unknown action" });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "PATCH") {
    try {
      const application = await updateApplicationStage(applicationId, user, await readBody(req));
      res.status(200).json({ application });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
