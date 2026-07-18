import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { assertCanEdit, assertCandidateWorkspace } from "../../../_lib/roles.js";
import {
  deleteTimelineEntry,
  getTimelineEntryForUser,
  updateTimelineEntry,
} from "../../../_lib/career/service.js";

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

function entryIdFromReq(req) {
  if (req.query?.entryId != null) return req.query.entryId;
  if (req.query?.id != null) return req.query.id;
  const match = String(req.url || "").match(/\/career-timeline\/([^/?#]+)/);
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

  const entryId = entryIdFromReq(req);
  if (!entryId) {
    res.status(400).json({ detail: "Entry id required" });
    return;
  }

  if (req.method === "GET") {
    const entry = await getTimelineEntryForUser(entryId, user.id);
    if (!entry) {
      res.status(404).json({ detail: "Timeline entry not found" });
      return;
    }
    res.status(200).json({ entry });
    return;
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    try {
      assertCanEdit(user);
      const payload = await readBody(req);
      const entry = await updateTimelineEntry(entryId, user.id, payload || {});
      res.status(200).json({ entry });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to update entry" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      assertCanEdit(user);
      await deleteTimelineEntry(entryId, user.id);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to delete entry" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
