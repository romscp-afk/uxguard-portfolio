import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import { assertCanEdit, assertCandidateWorkspace } from "../../_lib/roles.js";
import {
  getOrCreateCareerProfile,
  updateCareerProfile,
} from "../../_lib/career/service.js";

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

  try {
    assertCandidateWorkspace(user);
  } catch (err) {
    res.status(err.status || 403).json({ detail: err.message });
    return;
  }

  if (req.method === "GET") {
    const profile = await getOrCreateCareerProfile(user.id);
    res.status(200).json({ profile });
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      assertCanEdit(user);
      const payload = await readBody(req);
      const profile = await updateCareerProfile(user.id, payload || {});
      res.status(200).json({ profile });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to update profile" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
