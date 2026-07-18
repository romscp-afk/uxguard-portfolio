import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { assertCanEdit, assertCandidateWorkspace } from "../../../../_lib/roles.js";
import {
  getResumeTimelineSelections,
  putResumeTimelineSelections,
} from "../../../../_lib/career/service.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

function resumeIdFromReq(req) {
  if (req.query?.id != null) return req.query.id;
  const match = String(req.url || "").match(/\/resumes\/([^/?#]+)\/timeline-selection/);
  return match?.[1] || null;
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    assertCandidateWorkspace(user);
  } catch (err) {
    res.status(err.status || 403).json({ detail: err.message });
    return;
  }

  const resumeId = resumeIdFromReq(req);
  if (!resumeId) {
    res.status(400).json({ detail: "Resume id required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const data = await getResumeTimelineSelections(resumeId, user.id);
      res.status(200).json(data);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to load selections" });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      assertCanEdit(user);
      const payload = await readBody(req);
      const data = await putResumeTimelineSelections(
        resumeId,
        user.id,
        payload.selections || payload || [],
      );
      res.status(200).json(data);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to save selections" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
