import { assertUrlSafe } from "./url-safety.js";
import { normalizeVerificationChallenge, uid } from "./schema.js";

function token() {
  return `uxg-${uid("v").replace(/_/g, "").slice(0, 24)}`;
}

export function buildChallenge(target, method = "meta_tag") {
  const value = token();
  const hostname = (() => {
    try {
      return new URL(target.base_url).hostname;
    } catch {
      return "your-domain";
    }
  })();

  let instructions = "";
  if (method === "dns_txt") {
    instructions = `Add a DNS TXT record on ${hostname} with value: ${value}`;
  } else if (method === "html_file") {
    instructions = `Host a file at ${new URL(target.base_url).origin}/.well-known/uxguard-testlab.txt containing exactly: ${value}`;
  } else {
    instructions = `Add this meta tag to the homepage <head>: <meta name="uxguard-testlab-verification" content="${value}" />`;
  }

  return normalizeVerificationChallenge({
    target_id: target.id,
    project_id: target.project_id,
    method,
    token: value,
    status: "pending",
    instructions,
  });
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 10000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "UXGuard-TestLab-Verifier/1.0" },
    });
    if (res.status >= 300 && res.status < 400) {
      const err = new Error("Unexpected redirect during verification");
      err.status = 400;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`Verification fetch failed (${res.status})`);
      err.status = 400;
      throw err;
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function confirmChallenge(challenge, target) {
  if (!challenge || challenge.status === "expired") {
    const err = new Error("Verification challenge is missing or expired");
    err.status = 400;
    throw err;
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    const err = new Error("Verification challenge has expired");
    err.status = 400;
    throw err;
  }

  await assertUrlSafe(target.base_url);

  if (process.env.UXGUARD_TEST === "1" && process.env.TESTLAB_SKIP_VERIFY === "1") {
    return true;
  }

  if (challenge.method === "meta_tag") {
    const html = await fetchText(target.base_url);
    const re = /<meta[^>]+name=["']uxguard-testlab-verification["'][^>]+content=["']([^"']+)["']/i;
    const alt = /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']uxguard-testlab-verification["']/i;
    const match = html.match(re) || html.match(alt);
    if (!match || match[1] !== challenge.token) {
      const err = new Error("Verification meta tag not found or token mismatch");
      err.status = 400;
      throw err;
    }
    return true;
  }

  if (challenge.method === "html_file") {
    const origin = new URL(target.base_url).origin;
    const body = (await fetchText(`${origin}/.well-known/uxguard-testlab.txt`)).trim();
    if (body !== challenge.token) {
      const err = new Error("Verification file missing or token mismatch");
      err.status = 400;
      throw err;
    }
    return true;
  }

  if (challenge.method === "dns_txt") {
    const dns = await import("node:dns/promises");
    const hostname = new URL(target.base_url).hostname;
    let records = [];
    try {
      records = await dns.resolveTxt(hostname);
    } catch {
      const err = new Error("Could not resolve DNS TXT records");
      err.status = 400;
      throw err;
    }
    const flat = records.map((parts) => parts.join(""));
    if (!flat.includes(challenge.token)) {
      const err = new Error("DNS TXT token not found");
      err.status = 400;
      throw err;
    }
    return true;
  }

  const err = new Error("Unsupported verification method");
  err.status = 400;
  throw err;
}
