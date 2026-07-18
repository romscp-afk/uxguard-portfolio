import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

const ALLOWED_PORTS = new Set([80, 443, 8080, 8443, 3000, 4173, 5173, 8000]);

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.code = "URL_SAFETY";
  return err;
}

export function isPrivateOrReservedIp(ip) {
  const version = net.isIP(ip);
  if (!version) return false;

  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  if (normalized.startsWith("::ffff:")) {
    return isPrivateOrReservedIp(normalized.slice(7));
  }
  return false;
}

export function parseTargetUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) throw httpError("Target URL is required");

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw httpError("Target URL is invalid");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw httpError("Only http and https URLs are allowed");
  }

  if (parsed.username || parsed.password) {
    throw httpError("URLs with embedded credentials are not allowed");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) throw httpError("Target hostname is required");
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw httpError("Localhost and metadata hostnames are blocked");
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw httpError("Local and internal hostnames are blocked");
  }
  if (hostname === "0.0.0.0" || (net.isIP(hostname) && isPrivateOrReservedIp(hostname))) {
    throw httpError("Private or reserved IP addresses are blocked");
  }

  const port = parsed.port
    ? Number(parsed.port)
    : parsed.protocol === "https:"
      ? 443
      : 80;
  if (!ALLOWED_PORTS.has(port)) {
    throw httpError(`Port ${port} is not allowed for TestLab targets`);
  }

  return {
    href: parsed.href,
    origin: parsed.origin,
    hostname,
    protocol: parsed.protocol,
    port,
    pathname: parsed.pathname || "/",
  };
}

export async function assertUrlSafe(raw, options = {}) {
  const parsed = parseTargetUrl(raw);
  const skipDns = Boolean(options.skipDns) || process.env.UXGUARD_TEST === "1";

  if (skipDns) return parsed;

  let addresses = [];
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw httpError(`Could not resolve hostname: ${parsed.hostname}`);
  }

  if (!addresses.length) {
    throw httpError(`Could not resolve hostname: ${parsed.hostname}`);
  }

  for (const entry of addresses) {
    if (isPrivateOrReservedIp(entry.address)) {
      throw httpError("Resolved address is private or reserved (SSRF blocked)");
    }
  }

  return { ...parsed, resolved_ips: addresses.map((a) => a.address) };
}

export function sanitizeRedirectUrl(currentOrigin, locationHeader) {
  if (!locationHeader) return null;
  try {
    const next = new URL(locationHeader, currentOrigin);
    parseTargetUrl(next.href);
    return next.href;
  } catch {
    return null;
  }
}
