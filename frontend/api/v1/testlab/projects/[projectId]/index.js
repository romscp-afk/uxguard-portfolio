import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { idFrom, readBody } from "../../../_lib/testlab/http.js";
import {
  deleteProject,
  getProjectDetail,
  updateProject,
} from "../../../_lib/testlab/service.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const projectId = idFrom(req, ["projectId", "param", "id"], /\/testlab\/projects\/([^/?#]+)/);
  if (!projectId) {
    res.status(400).json({ detail: "projectId required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const detail = await getProjectDetail(user, projectId);
      res.status(200).json(detail);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "PATCH") {
    try {
      const payload = await readBody(req);
      const project = await updateProject(user, projectId, payload || {});
      res.status(200).json({ project });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const result = await deleteProject(user, projectId);
      res.status(200).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
