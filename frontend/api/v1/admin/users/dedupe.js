import { requireAuthUser } from "../../../_lib/auth.js";
import { adminDedupeUsers } from "../../../_lib/admin-users.js";
import { isAdmin } from "../../../_lib/roles.js";
import { withApi } from "../../../_lib/withApi.js";

/** Admin-only: merge duplicate username/email rows onto the canonical lowest id. */
export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (!isAdmin(user)) {
    res.status(403).json({ detail: "Admin access required." });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    const result = await adminDedupeUsers();
    res.status(200).json(result);
  } catch (err) {
    console.error("[admin/users/dedupe]", err);
    res.status(500).json({ detail: err?.message || "Could not dedupe users." });
  }
});
