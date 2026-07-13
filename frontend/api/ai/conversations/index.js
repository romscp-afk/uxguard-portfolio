import { requireAuthUser } from "../../_lib/auth.js";
import { listConversations, getRecentConversations } from "../../_lib/ai/persistence.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const q = req.query?.q;
      const recent = req.query?.recent === "true";
      const list = recent
        ? await getRecentConversations(user.id, Number(req.query?.limit) || 5)
        : await listConversations(user.id, { q });
      res.status(200).json({ conversations: list });
    } catch {
      res.status(500).json({ detail: "Could not load conversations." });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
