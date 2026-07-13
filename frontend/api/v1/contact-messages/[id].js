import {
  deleteContactMessage,
  getContactMessage,
  getThreadMessages,
  updateContactMessage,
  composeContactMessage,
  getContactMailboxCounts,
} from "../../_lib/contact-store.js";
import { requireAuthUser } from "../../_lib/auth.js";
import { isAdmin } from "../../_lib/roles.js";
import { withApi } from "../../_lib/withApi.js";

const CONTACT_TO = String(process.env.CONTACT_TO || "uxguardstudio@gmail.com").toLowerCase();

function assertMailboxAdmin(user, res) {
  const email = String(user.email || "").toLowerCase();
  if (!isAdmin(user) && email !== CONTACT_TO) {
    res.status(403).json({ detail: "Admin access required." });
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
  return {};
}

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (!assertMailboxAdmin(user, res)) return;

  const id = (() => {
    const raw = req.query?.id ?? req.query?.param;
    const fromQuery = Array.isArray(raw) ? raw[0] : raw;
    if (fromQuery != null && /^\d+$/.test(String(fromQuery))) return Number(fromQuery);
    const path = String(req.url || "").split("?")[0];
    const match = path.match(/\/contact-messages\/(\d+)(?:\/)?$/);
    return match ? Number(match[1]) : NaN;
  })();
  if (!Number.isFinite(id)) {
    res.status(400).json({ detail: "Invalid message id." });
    return;
  }

  if (req.method === "GET") {
    const message = await getContactMessage(id);
    if (!message) {
      res.status(404).json({ detail: "Message not found." });
      return;
    }
    const thread = await getThreadMessages(message.thread_id);
    res.status(200).json({ message, thread });
    return;
  }

  if (req.method === "PATCH") {
    const body = await readBody(req);
    const updated = await updateContactMessage(id, body);
    if (!updated) {
      res.status(404).json({ detail: "Message not found." });
      return;
    }
    const counts = await getContactMailboxCounts();
    res.status(200).json({ message: updated, counts });
    return;
  }

  if (req.method === "DELETE") {
    const permanent = String(req.query?.permanent || "") === "true";
    const deleted = await deleteContactMessage(id, { permanent });
    if (!deleted) {
      res.status(404).json({ detail: "Message not found." });
      return;
    }
    const counts = await getContactMailboxCounts();
    res.status(200).json({ deleted, counts });
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    const parent = await getContactMessage(id);
    if (!parent) {
      res.status(404).json({ detail: "Message not found." });
      return;
    }
    try {
      const saved = await composeContactMessage({
        toEmail: body.toEmail || parent.email || parent.from_email,
        toName: body.toName || parent.name || parent.from_name,
        subject: body.subject || `Re: ${parent.subject}`,
        message: body.message,
        folder: body.draft ? "drafts" : "sent",
        parentId: parent.id,
        threadId: parent.thread_id,
        inquiryType: parent.inquiry_type,
        fromName: user.name || "UXGuard Studio",
        fromEmail: user.email || CONTACT_TO,
      });
      const thread = await getThreadMessages(parent.thread_id);
      const counts = await getContactMailboxCounts();
      res.status(201).json({ message: saved, thread, counts });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Reply failed." });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
