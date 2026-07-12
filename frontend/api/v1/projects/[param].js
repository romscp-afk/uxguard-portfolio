import {
  assertCanEdit,
  deleteProject,
  getProjectForAuthor,
  updateProject,
} from "../../_lib/projects.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

function parseProjectId(req) {
  const raw = req.query?.param ?? req.query?.id;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery != null && /^\d+$/.test(String(fromQuery))) {
    return Number(fromQuery);
  }

  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/projects\/(\d+)(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const id = parseProjectId(req);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ detail: "Invalid project id" });
    return;
  }

  if (req.method === "GET") {
    const project = await getProjectForAuthor(id, user.id);
    if (!project) {
      res.status(404).json({ detail: "Project not found" });
      return;
    }
    res.status(200).json(project);
    return;
  }

  if (req.method === "PATCH") {
    try {
      assertCanEdit(user);
      const updated = await updateProject(id, user.id, req.body || {});
      res.status(200).json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to update project" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      assertCanEdit(user);
      await deleteProject(id, user.id);
      res.status(204).end();
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to delete project" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
