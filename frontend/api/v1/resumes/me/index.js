import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import {
  createBlankResumeForUser,
  getResumeForUser,
  saveResumeForUser,
  assertCanEdit,
} from "../../../_lib/resume/service.js";

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

/** Legacy single-resume endpoints — prefer /api/v1/resumes and /api/v1/resumes/:id. */
export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const resume = await getResumeForUser(user.id);
    res.status(200).json({ resume });
    return;
  }

  if (req.method === "PUT") {
    try {
      assertCanEdit(user);
      const body = await readBody(req);
      if (body.create_blank === true) {
        const resume = await createBlankResumeForUser(user.id, body);
        res.status(200).json({ resume });
        return;
      }
      const resume = await saveResumeForUser(user.id, body);
      res.status(200).json({ resume });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to save resume" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
