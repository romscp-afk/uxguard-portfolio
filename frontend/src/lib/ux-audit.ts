/** Client-side URL validation for UX audit submissions. */

const URL_PATTERN =
  /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;

export function validateAuditUrlInput(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter your website URL." };
  }
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { ok: false, error: "Only HTTP and HTTPS URLs are supported." };
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost")) {
      return { ok: false, error: "Localhost URLs cannot be audited." };
    }
    if (!URL_PATTERN.test(candidate.replace(/\s/g, ""))) {
      return { ok: false, error: "Please enter a valid website URL." };
    }
    return { ok: true, value: candidate };
  } catch {
    return { ok: false, error: "Please enter a valid website URL." };
  }
}

export const UX_AUDIT_CATEGORY_LABELS: Record<string, string> = {
  usability_navigation: "Usability & navigation",
  conversion_journey: "Conversion journey",
  accessibility: "Accessibility",
  mobile_experience: "Mobile experience",
  performance: "Performance",
  content_trust: "Content clarity",
};

export function severityLabel(severity: string) {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}
