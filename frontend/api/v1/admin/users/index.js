import { requireAuthUser } from "../../../_lib/auth.js";
import { adminListUsers } from "../../../_lib/admin-users.js";
import { isAdmin } from "../../../_lib/roles.js";
import { withApi } from "../../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (!isAdmin(user)) {
    res.status(403).json({ detail: "Admin access required." });
    return;
  }

  if (req.method === "GET") {
    try {
      const users = await adminListUsers();
      res.status(200).json(users);
    } catch (err) {
      console.error("[admin/users]", err);
      res.status(500).json({ detail: err?.message || "Could not load users." });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
