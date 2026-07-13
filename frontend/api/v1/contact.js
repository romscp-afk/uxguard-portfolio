import { saveContactMessage } from "../_lib/contact-store.js";
import { isPersistentStoreEnabled } from "../_lib/store.js";
import { withApi } from "../_lib/withApi.js";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
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

/**
 * Public contact form — stores messages in the admin Contact Inbox.
 * Admin notifications are created inside saveContactMessage.
 */
export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const body = await readBody(req);
  const {
    name,
    email,
    inquiryType,
    subject,
    message,
    uxg_hp: honeypot,
  } = body || {};

  const honeypotValue = String(honeypot || "").trim();
  if (honeypotValue) {
    res.status(200).json({ message: "Message sent." });
    return;
  }

  const trimmedName = String(name || "").trim();
  const trimmedEmail = String(email || "").trim();
  const trimmedSubject = String(subject || "").trim();
  const trimmedMessage = String(message || "").trim();
  const trimmedType = String(inquiryType || "").trim();

  if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
    res.status(400).json({ detail: "Name, email, subject, and message are required." });
    return;
  }

  if (!isValidEmail(trimmedEmail)) {
    res.status(400).json({ detail: "Please enter a valid email address." });
    return;
  }

  if (trimmedName.length > 120 || trimmedSubject.length > 200 || trimmedMessage.length > 5000) {
    res.status(400).json({ detail: "One or more fields are too long." });
    return;
  }

  if (!isPersistentStoreEnabled()) {
    res.status(503).json({
      detail:
        "Contact inbox storage is not configured. Add BLOB_READ_WRITE_TOKEN to the deployment environment.",
    });
    return;
  }

  try {
    const entry = await saveContactMessage({
      name: trimmedName,
      email: trimmedEmail,
      inquiryType: trimmedType,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    res.status(200).json({
      message: "Message received. It is now in the admin Contact Inbox.",
      delivered_to: "inbox",
      id: entry.id,
    });
  } catch (err) {
    res.status(503).json({
      detail: err.message || "Could not save your message. Please try again later.",
    });
  }
});
