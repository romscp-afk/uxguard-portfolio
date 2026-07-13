import {
  bulkDeleteContactMessages,
  bulkUpdateContactMessages,
  composeContactMessage,
  emptyTrash,
  getContactMailboxCounts,
  getThreadMessages,
  listContactMessages,
} from "../_lib/contact-store.js";
import { requireAuthUser } from "../_lib/auth.js";
import { isAdmin } from "../_lib/roles.js";
import { withApi } from "../_lib/withApi.js";

const CONTACT_TO = String(process.env.CONTACT_TO || "uxguardstudio@gmail.com").toLowerCase();

function assertMailboxAdmin(user, res) {
  const email = String(user.email || "").toLowerCase();
  if (!isAdmin(user) && email !== CONTACT_TO) {
    res.status(403).json({
      detail: "Admin access required. Sign in with an admin account to use the Contact Inbox.",
    });
    return false;
  }
  return true;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString("utf8"));
    } catch {
      return {};
    }
  }
  return {};
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (!assertMailboxAdmin(user, res)) return;

  if (req.method === "GET") {
    const folder = String(req.query?.folder || "inbox");
    const q = String(req.query?.q || "");
    const threadId = req.query?.thread_id ? String(req.query.thread_id) : null;

    if (threadId) {
      const thread = await getThreadMessages(threadId);
      res.status(200).json({ messages: thread, thread_id: threadId });
      return;
    }

    const messages = await listContactMessages({ folder, q });
    const counts = await getContactMailboxCounts();
    res.status(200).json({
      messages,
      counts,
      unread_count: counts.inbox_unread,
      folder,
    });
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    const action = body.action || "compose";

    try {
      if (action === "compose" || action === "reply" || action === "draft") {
        const saved = await composeContactMessage({
          toEmail: body.toEmail || body.to_email,
          toName: body.toName || body.to_name || "",
          subject: body.subject,
          message: body.message,
          folder: action === "draft" ? "drafts" : "sent",
          parentId: body.parentId || body.parent_id || null,
          threadId: body.threadId || body.thread_id || null,
          inquiryType: body.inquiryType || body.inquiry_type,
          fromName: user.name || "UXGuard Studio",
          fromEmail: user.email || CONTACT_TO,
        });
        const counts = await getContactMailboxCounts();
        res.status(201).json({ message: saved, counts });
        return;
      }

      if (action === "bulk_read" || action === "bulk_unread") {
        const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
        const updated = await bulkUpdateContactMessages(ids, {
          read: action === "bulk_read",
        });
        const counts = await getContactMailboxCounts();
        res.status(200).json({ messages: updated, counts });
        return;
      }

      if (action === "bulk_star" || action === "bulk_unstar") {
        const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
        const updated = await bulkUpdateContactMessages(ids, {
          starred: action === "bulk_star",
        });
        const counts = await getContactMailboxCounts();
        res.status(200).json({ messages: updated, counts });
        return;
      }

      if (action === "bulk_trash") {
        const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
        const updated = await bulkUpdateContactMessages(ids, { folder: "trash" });
        const counts = await getContactMailboxCounts();
        res.status(200).json({ messages: updated, counts });
        return;
      }

      if (action === "bulk_delete") {
        const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
        const deleted = await bulkDeleteContactMessages(ids, {
          permanent: Boolean(body.permanent),
        });
        const counts = await getContactMailboxCounts();
        res.status(200).json({ deleted, counts });
        return;
      }

      if (action === "empty_trash") {
        const result = await emptyTrash();
        const counts = await getContactMailboxCounts();
        res.status(200).json({ ...result, counts });
        return;
      }

      res.status(400).json({ detail: "Unknown action." });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Mailbox action failed." });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
