/**
 * Sends transactional email via Resend (https://resend.com).
 * Set RESEND_API_KEY and MAIL_FROM in Vercel env for production.
 */
export async function sendPasswordResetEmail({ to, resetUrl, userName }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "UXguard <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error(
      "Email service is not configured. Add RESEND_API_KEY to your deployment environment.",
    );
  }

  const subject = "Reset your UXguard password";
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
      <h2 style="color: #0eb5bd;">UXGuard Studio</h2>
      <p>Hi${userName ? ` ${userName}` : ""},</p>
      <p>We received a request to reset your portfolio account password.</p>
      <p style="margin: 28px 0;">
        <a href="${resetUrl}" style="background:#0eb5bd;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Reset password
        </a>
      </p>
      <p style="font-size:13px;color:#666;">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
      <p style="font-size:12px;color:#999;word-break:break-all;">${resetUrl}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Email delivery failed (${res.status})`);
  }

  return res.json();
}

export async function sendNewCaseStudyEmail({ to, userName, authorName, studyTitle, studyUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "UXGuard Studio <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error(
      "Email service is not configured. Add RESEND_API_KEY to your deployment environment.",
    );
  }

  const subject = `${authorName} published a new case study`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
      <h2 style="color: #0eb5bd;">UXGuard Studio</h2>
      <p>Hi${userName ? ` ${userName}` : ""},</p>
      <p><strong>${authorName}</strong> just published a new case study on UXGuard Studio:</p>
      <p style="font-size:18px;font-weight:600;margin:20px 0;">${studyTitle}</p>
      <p style="margin: 28px 0;">
        <a href="${studyUrl}" style="background:#0eb5bd;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Read case study
        </a>
      </p>
      <p style="font-size:13px;color:#666;">You're receiving this because you're a registered member of the UXGuard Studio community.</p>
      <p style="font-size:12px;color:#999;word-break:break-all;">${studyUrl}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Email delivery failed (${res.status})`);
  }

  return res.json();
}

export async function sendContactFormEmail({
  to,
  name,
  email,
  inquiryType,
  subject,
  message,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "UXGuard Studio <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error(
      "Email service is not configured. Add RESEND_API_KEY to your deployment environment.",
    );
  }

  const fullSubject = inquiryType ? `[${inquiryType}] ${subject}` : subject;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeType = escapeHtml(inquiryType || "General");
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
      <h2 style="color: #0eb5bd;">New contact form message</h2>
      <p><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
      <p><strong>Inquiry type:</strong> ${safeType}</p>
      <p><strong>Subject:</strong> ${safeSubject}</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <div style="line-height: 1.6; white-space: pre-wrap;">${safeMessage}</div>
      <p style="margin-top: 28px; font-size: 13px; color: #666;">Reply directly to this email to respond to ${safeName}.</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: fullSubject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Email delivery failed (${res.status})`);
  }

  return res.json();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
