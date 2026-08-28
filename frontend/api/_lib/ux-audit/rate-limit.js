import { viewerKeyFromRequest } from "../analytics.js";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const buckets = new Map();

function prune() {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.start > WINDOW_MS) buckets.delete(key);
  }
}

export function assertUxAuditRateLimit(req) {
  prune();
  const key = viewerKeyFromRequest(req);
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    const err = new Error("Too many audit requests. Please try again in about an hour.");
    err.status = 429;
    throw err;
  }
}
