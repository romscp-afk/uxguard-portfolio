import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import { assertIsAdmin, reorderProjects } from "../../_lib/projects.js";

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    assertIsAdmin(user);
  } catch (err) {
    res.status(err.status || 403).json({ detail: err.message || "Forbidden" });
    return;
  }

  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) {
    res.status(400).json({ detail: "Expected { ids: number[] }" });
    return;
  }

  await reorderProjects(user.id, ids);
  res.status(200).json({ ok: true, reordered: ids.length });
});
