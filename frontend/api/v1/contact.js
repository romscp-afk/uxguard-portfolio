import { saveContactMessage } from "../_lib/contact-store.js";
import { withApi } from "../_lib/withApi.js";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

/**
 * Public contact form — stores messages in the admin Contact Inbox only.
 * Outbound email is disabled for now (enable later with CONTACT_SEND_EMAIL=true + Resend).
 */
export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const { name, email, inquiryType, subject, message, website } = req.body || {};

  if (website) {
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

  try {
    await saveContactMessage({
      name: trimmedName,
      email: trimmedEmail,
      inquiryType: trimmedType,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    res.status(200).json({
      message: "Message received. We'll get back to you soon.",
      delivered_to: "inbox",
    });
  } catch (err) {
    res.status(503).json({
      detail: err.message || "Could not save your message. Please try again later.",
    });
  }
});
