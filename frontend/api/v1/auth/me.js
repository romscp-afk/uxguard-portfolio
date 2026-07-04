import { getAuthUser, requireAuth } from "../../_lib/auth.js";
import { toUserOut } from "../../_lib/demo-data.js";

export default function handler(req, res) {
  const session = requireAuth(req);
  if (!session) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }

  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }

  if (req.method === "GET") {
    res.status(200).json(toUserOut(user));
    return;
  }

  if (req.method === "PATCH") {
    // Demo mode: echo merged profile (not persisted on Vercel)
    const updates = req.body || {};
    res.status(200).json(toUserOut({ ...user, ...updates }));
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
}
