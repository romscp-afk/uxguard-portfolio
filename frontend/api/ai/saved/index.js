import { requireAuthUser } from "../../_lib/auth.js";
import { assertCanEdit } from "../../_lib/projects.js";
import { listSavedOutputs, saveOutput } from "../../_lib/ai/persistence.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const outputs = await listSavedOutputs(user.id);
      res.status(200).json({ outputs });
    } catch {
      res.status(500).json({ detail: "Could not load saved outputs." });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      assertCanEdit(user);
      const body = req.body || {};
      if (!body.content) {
        res.status(400).json({ detail: "content is required" });
        return;
      }
      const saved = await saveOutput(user.id, {
        conversation_id: body.conversation_id || null,
        title: body.title || "Saved AI output",
        output_type: body.output_type || "general",
        content: body.content,
      });
      res.status(201).json(saved);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Could not save output" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
