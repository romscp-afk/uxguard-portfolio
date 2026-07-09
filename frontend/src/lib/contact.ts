/** Primary contact email for UXGuard Studio */
export const CONTACT_EMAIL = "uxguardstudio@gmail.com";

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

export type ContactFormPayload = {
  name: string;
  email: string;
  subject: string;
  inquiryType: string;
  message: string;
};

export function buildContactMailto({
  name,
  email,
  subject,
  inquiryType,
  message,
}: ContactFormPayload): string {
  const fullSubject = inquiryType ? `[${inquiryType}] ${subject}` : subject;
  const body = [
    `Name: ${name}`,
    `Reply-to: ${email}`,
    inquiryType ? `Inquiry type: ${inquiryType}` : "",
    "",
    message,
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams();
  params.set("subject", fullSubject);
  params.set("body", body);
  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}
