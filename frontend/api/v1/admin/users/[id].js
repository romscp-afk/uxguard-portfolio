import { requireAuthUser } from "../../../_lib/auth.js";
import { adminDeleteUser, adminGetUser, adminUpdateUser } from "../../../_lib/admin-users.js";
import { isAdmin } from "../../../_lib/roles.js";
import { withApi } from "../../../_lib/withApi.js";

function parseId(req) {
  const raw = req.query?.id ?? req.query?.param;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : NaN;
}

export default withApi(async (req, res) => {
  const actor = await requireAuthUser(req, res);
  if (!actor) return;

  if (!isAdmin(actor)) {
    res.status(403).json({ detail: "Admin access required." });
    return;
  }

  const id = parseId(req);
  if (!Number.isFinite(id)) {
    res.status(400).json({ detail: "Invalid user id" });
    return;
  }

  if (req.method === "GET") {
    try {
      const user = await adminGetUser(id);
      if (!user) {
        res.status(404).json({ detail: "User not found" });
        return;
      }
      res.status(200).json(user);
    } catch (err) {
      console.error("[admin/users/:id GET]", err);
      res.status(500).json({ detail: err?.message || "Could not load user." });
    }
    return;
  }

  if (req.method === "PATCH") {
    try {
      const updated = await adminUpdateUser(id, req.body || {}, actor.id);
      res.status(200).json(updated);
    } catch (err) {
      const message = err.message || "Update failed";
      const status = message.includes("not found") ? 404 : 400;
      res.status(status).json({ detail: message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const result = await adminDeleteUser(id, actor.id);
      res.status(200).json(result);
    } catch (err) {
      const message = err.message || "Delete failed";
      const status = message.includes("not found") ? 404 : 400;
      res.status(status).json({ detail: message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
