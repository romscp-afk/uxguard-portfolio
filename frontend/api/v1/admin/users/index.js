import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { isAdmin } from "../../../_lib/roles.js";
import { adminCreateAccount } from "../../../_lib/admin-employers.js";
import { adminListUsers } from "../../../_lib/admin-users.js";

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) {
    res.status(403).json({ detail: "Admin access required." });
    return;
  }

  if (req.method === "GET") {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      const users = await adminListUsers();
      res.status(200).json(users);
    } catch (err) {
      console.error("[admin/users]", err);
      res.status(500).json({ detail: err?.message || "Could not load users." });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = await readBody(req);
      const result = await adminCreateAccount(user, body || {});
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Could not create account" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
