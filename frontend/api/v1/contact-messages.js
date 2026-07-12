import { listContactMessages } from "../_lib/contact-store.js";
import { requireAuthUser } from "../_lib/auth.js";
import { withApi } from "../_lib/withApi.js";

const CONTACT_TO = process.env.CONTACT_TO || "uxguardstudio@gmail.com";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (user.role !== "admin" && user.email !== CONTACT_TO) {
    res.status(403).json({ detail: "Admin access required." });
    return;
  }

  const messages = await listContactMessages();
  const unread_count = messages.filter((message) => !message.read).length;
  res.status(200).json({ messages, unread_count });
});
