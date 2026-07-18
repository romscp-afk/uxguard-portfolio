import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import {
  assertCanEdit,
  getResumeByIdForUser,
  softDeleteResumeForUser,
  updateResumeForUser,
  archiveResumeForUser,
  renameResumeForUser,
} from "../../../_lib/resume/service.js";

function parseResumeId(req) {
  const raw = req.query?.id ?? req.query?.param;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery != null && /^\d+$/.test(String(fromQuery))) {
    return Number(fromQuery);
  }

  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/resumes\/(\d+)(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
}

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

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const id = parseResumeId(req);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ detail: "Invalid resume id" });
    return;
  }

  if (req.method === "GET") {
    const resume = await getResumeByIdForUser(id, user.id);
    if (!resume) {
      res.status(404).json({ detail: "Resume not found" });
      return;
    }
    res.status(200).json({ resume });
    return;
  }

  if (req.method === "PATCH") {
    try {
      assertCanEdit(user);
      const payload = await readBody(req);
      if (payload?.action === "rename") {
        const resume = await renameResumeForUser(id, user.id, payload.title);
        res.status(200).json({ resume });
        return;
      }
      if (payload?.action === "archive") {
        const resume = await archiveResumeForUser(id, user.id);
        res.status(200).json({ resume });
        return;
      }
      const resume = await updateResumeForUser(id, user.id, payload || {});
      res.status(200).json({ resume });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to update resume" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      assertCanEdit(user);
      await softDeleteResumeForUser(id, user.id);
      res.status(204).end();
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to delete resume" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
