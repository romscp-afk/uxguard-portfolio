import { listPublicStudioProjects } from "../_lib/projects.js";
import { withApi } from "../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const projects = await listPublicStudioProjects();
  res.status(200).json(projects);
});
