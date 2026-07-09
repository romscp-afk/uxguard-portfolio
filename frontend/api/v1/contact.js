import { sendContactFormEmail } from "../../_lib/mail.js";
import { saveContactMessage } from "../../_lib/contact-store.js";
import { isPersistentStoreEnabled } from "../../_lib/store.js";
import { withApi } from "../../_lib/withApi.js";

const CONTACT_TO = process.env.CONTACT_TO || "uxguardstudio@gmail.com";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

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

  const payload = {
    name: trimmedName,
    email: trimmedEmail,
    inquiryType: trimmedType,
    subject: trimmedSubject,
    message: trimmedMessage,
  };

  let saved = false;
  let emailed = false;
  let emailError = null;

  if (isPersistentStoreEnabled()) {
    await saveContactMessage(payload);
    saved = true;
  }

  if (process.env.RESEND_API_KEY) {
    try {
      await sendContactFormEmail({
        to: CONTACT_TO,
        ...payload,
      });
      emailed = true;
    } catch (err) {
      emailError = err;
    }
  }

  if (saved || emailed) {
    res.status(200).json({
      message: emailed
        ? "Message sent. We'll get back to you soon."
        : "Message received. We'll get back to you soon.",
    });
    return;
  }

  if (emailError) {
    res.status(503).json({
      detail: emailError.message || "Could not send your message. Please try again later.",
    });
    return;
  }

  res.status(503).json({
    detail:
      "Contact form storage is not configured. Add BLOB_READ_WRITE_TOKEN or RESEND_API_KEY to your deployment environment.",
  });
});
