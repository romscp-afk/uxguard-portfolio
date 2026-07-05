import { getAuthUser, requireAuth } from "../../_lib/auth.js";
import { toUserOut, updateUserProfile } from "../../_lib/demo-data.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const session = requireAuth(req);
  if (!session) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }

  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }

  if (req.method === "GET") {
    res.status(200).json(toUserOut(user));
    return;
  }

  if (req.method === "PATCH") {
    try {
      const updates = req.body || {};
      const updated = await updateUserProfile(user.id, updates);
      if (!updated) {
        res.status(404).json({ detail: "User not found" });
        return;
      }
      res.status(200).json(toUserOut(updated));
    } catch (err) {
      res.status(400).json({ detail: err.message || "Update failed" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
