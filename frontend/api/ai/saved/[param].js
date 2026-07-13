import { requireAuthUser } from "../../_lib/auth.js";
import { assertCanEdit } from "../../_lib/projects.js";
import { deleteSavedOutput } from "../../_lib/ai/persistence.js";
import { withApi } from "../../_lib/withApi.js";

function parseId(req) {
  const raw = req.query?.param ?? req.query?.id;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery) return String(fromQuery);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/saved\/([^/]+)(?:\/)?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const id = parseId(req);
  if (!id) {
    res.status(400).json({ detail: "Output id required" });
    return;
  }

  if (req.method === "DELETE") {
    try {
      assertCanEdit(user);
      await deleteSavedOutput(id, user.id);
      res.status(204).end();
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Delete failed" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
