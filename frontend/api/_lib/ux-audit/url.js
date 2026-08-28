import { parseTargetUrl } from "../testlab/url-safety.js";

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

/**
 * Normalise user input to an HTTPS URL where possible.
 * @returns {{ href: string, normalized: string, hostname: string }}
 */
export function normalizeAuditUrl(raw) {
  let value = String(raw || "").trim();
  if (!value) {
    const err = new Error("Website URL is required.");
    err.status = 400;
    throw err;
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value.replace(/^\/+/, "")}`;
  }

  const parsed = parseTargetUrl(value);
  const normalized = parsed.protocol === "http:" ? parsed.href.replace(/^http:/, "https:") : parsed.href;

  return {
    href: parsed.href,
    normalized,
    hostname: parsed.hostname,
    protocol: parsed.protocol,
  };
}

export function isLikelyDomain(input) {
  const trimmed = String(input || "").trim().replace(/^https?:\/\//i, "").split("/")[0];
  return DOMAIN_RE.test(trimmed) || trimmed.includes(".");
}
