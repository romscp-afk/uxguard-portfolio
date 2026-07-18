import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/testlab/http.js";
import { acceptBaseline, listBaselines } from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const projectId = idFrom(req, ["projectId", "param"], /\/testlab\/projects\/([^/?#]+)\/baselines/);
  if (!projectId) {
    res.status(400).json({ detail: "projectId required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const baselines = await listBaselines(user, projectId);
      res.status(200).json({ baselines });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const baseline = await acceptBaseline(user, projectId, (await readBody(req)) || {});
      res.status(201).json({ baseline });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
