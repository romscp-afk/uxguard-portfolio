import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import {
  assertCanEdit,
  createResumeForUser,
  listResumesForUser,
} from "../../_lib/resume/service.js";

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

  if (req.method === "GET") {
    const resumes = await listResumesForUser(user.id);
    res.status(200).json({ resumes });
    return;
  }

  if (req.method === "POST") {
    try {
      assertCanEdit(user);
      const payload = await readBody(req);
      const resume = await createResumeForUser(user.id, payload || {});
      res.status(201).json({ resume });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to create resume" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
