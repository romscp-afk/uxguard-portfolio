import {
  assertCanEdit,
  createProject,
  listProjectsForUser,
} from "../_lib/projects.js";
import { requireAuthUser } from "../_lib/auth.js";
import { withApi } from "../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const projects = await listProjectsForUser(user.id);
    res.status(200).json(projects);
    return;
  }

  if (req.method === "POST") {
    try {
      assertCanEdit(user);
      const created = await createProject(user.id, req.body || {});
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to create project" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
