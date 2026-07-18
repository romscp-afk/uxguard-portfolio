import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import {
  assertCanEdit,
  createResumeVersionForUser,
  listResumeVersionsForUser,
} from "../../../../_lib/resume/service.js";

function parseResumeId(req) {
  const raw = req.query?.id ?? req.query?.param;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery != null && /^\d+$/.test(String(fromQuery))) return Number(fromQuery);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/resumes\/(\d+)\/versions(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
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
    try {
      const versions = await listResumeVersionsForUser(id, user.id);
      res.status(200).json({ versions });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to list versions" });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      assertCanEdit(user);
      const payload = await readBody(req);
      const result = await createResumeVersionForUser(id, user.id, payload || {});
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to create version" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
