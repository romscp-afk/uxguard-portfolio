import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationsRead,
} from "../../_lib/community.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const notifications = await listNotifications(user.id);
    const unread_count = await getUnreadNotificationCount(user.id);
    res.status(200).json({ notifications, unread_count });
    return;
  }

  if (req.method === "POST") {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : null;
    await markNotificationsRead(user.id, ids);
    const unread_count = await getUnreadNotificationCount(user.id);
    res.status(200).json({ ok: true, unread_count });
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
