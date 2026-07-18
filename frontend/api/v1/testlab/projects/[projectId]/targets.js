import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../../_lib/testlab/http.js";
import { addTarget } from "../../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const projectId = idFrom(req, ["projectId", "param"], /\/testlab\/projects\/([^/?#]+)\/targets/);
  if (!projectId) {
    res.status(400).json({ detail: "projectId required" });
    return;
  }

  if (req.method === "POST") {
    try {
      const payload = await readBody(req);
      const target = await addTarget(user, projectId, payload || {});
      res.status(201).json({ target });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message, code: err.code });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
