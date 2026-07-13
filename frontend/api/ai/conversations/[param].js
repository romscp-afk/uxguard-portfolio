import { requireAuthUser } from "../../_lib/auth.js";
import {
  deleteConversation,
  getConversationForUser,
  updateConversation,
} from "../../_lib/ai/persistence.js";
import { withApi } from "../../_lib/withApi.js";

function parseId(req) {
  const raw = req.query?.param ?? req.query?.id;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery) return String(fromQuery);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/conversations\/([^/]+)(?:\/)?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  const id = parseId(req);
  if (!id) {
    res.status(400).json({ detail: "Conversation id required" });
    return;
  }

  if (req.method === "GET") {
    const found = await getConversationForUser(id, user.id);
    if (!found) {
      res.status(404).json({ detail: "Conversation not found" });
      return;
    }
    res.status(200).json(found);
    return;
  }

  if (req.method === "PATCH") {
    try {
      const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 120) : null;
      if (!title) {
        res.status(400).json({ detail: "Title is required" });
        return;
      }
      const updated = await updateConversation(id, user.id, { title });
      res.status(200).json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Update failed" });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await deleteConversation(id, user.id);
      res.status(204).end();
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Delete failed" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
