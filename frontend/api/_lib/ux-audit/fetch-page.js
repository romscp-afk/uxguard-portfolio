import { assertUrlSafe } from "../testlab/url-safety.js";

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 12_000;

export async function fetchPublicPage(url, options = {}) {
  const parsed = await assertUrlSafe(url, options);
  let current = parsed.href;
  let redirects = 0;
  const start = Date.now();

  while (redirects <= MAX_REDIRECTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "UXGuard-AuditBot/1.0 (+https://uxguard.studio/ux-audit)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      const next = new URL(location, current).href;
      const safe = await assertUrlSafe(next, options);
      current = safe.href;
      redirects += 1;
      continue;
    }

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      const err = new Error("Target did not return HTML content.");
      err.status = 422;
      throw err;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      const err = new Error("Page response exceeded the safe size limit.");
      err.status = 422;
      throw err;
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    return {
      html,
      finalUrl: current,
      status: response.status,
      responseTimeMs: Date.now() - start,
      contentType,
    };
  }

  const err = new Error("Too many redirects while fetching the page.");
  err.status = 422;
  throw err;
}
