import { listContactMessages } from "../_lib/contact-store.js";
import { requireAuthUser } from "../_lib/auth.js";
import { isAdmin } from "../_lib/roles.js";
import { withApi } from "../_lib/withApi.js";

const CONTACT_TO = String(process.env.CONTACT_TO || "uxguardstudio@gmail.com").toLowerCase();

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  const email = String(user.email || "").toLowerCase();
  if (!isAdmin(user) && email !== CONTACT_TO) {
    res.status(403).json({
      detail: "Admin access required. Sign in with an admin account to view the Contact Inbox.",
    });
    return;
  }

  const messages = await listContactMessages();
  const unread_count = messages.filter((message) => !message.read).length;
  res.status(200).json({ messages, unread_count });
});
