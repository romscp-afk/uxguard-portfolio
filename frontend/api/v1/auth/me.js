import { getAuthUser, requireAuth } from "../../_lib/auth.js";
import { toUserOut, updateUserProfile } from "../../_lib/demo-data.js";
import { canEditPlatform, normalizeRole } from "../../_lib/roles.js";
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
    try {
      const { ensureFreeSubscription } = await import("../../_lib/billing/persistence.js");
      await ensureFreeSubscription(user.id);
    } catch {
      /* ignore provisioning errors on profile load */
    }
    try {
      const { repairBrokenUserMedia } = await import("../../_lib/media.js");
      await repairBrokenUserMedia(user.id);
    } catch {
      /* ignore repair errors */
    }
    // Re-read after billing/repair so we return the latest persisted profile media fields.
    const fresh = (await getAuthUser(req)) || user;
    res.status(200).json(toUserOut(fresh));
    return;
  }

  if (req.method === "PATCH") {
    if (!canEditPlatform({ role: normalizeRole(user.role) })) {
      res.status(403).json({ detail: "Your account is read-only. Upgrade to Professional to edit." });
      return;
    }
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
