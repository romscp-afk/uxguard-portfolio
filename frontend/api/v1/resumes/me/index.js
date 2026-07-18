import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import {
  createBlankResumeForUser,
  getResumeForUser,
  saveResumeForUser,
} from "../../_lib/resume/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const resume = await getResumeForUser(user.id);
    res.status(200).json({ resume });
    return;
  }

  if (req.method === "PUT") {
    const body = req.body || {};
    if (body.create_blank === true) {
      const resume = await createBlankResumeForUser(user.id);
      res.status(200).json({ resume });
      return;
    }
    const resume = await saveResumeForUser(user.id, body);
    res.status(200).json({ resume });
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
