import { MAX_REQUESTS_PER_HOUR } from "./config.js";

const buckets = new Map();

export function assertRateLimit(userId) {
  const key = String(userId);
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt > windowMs) {
    bucket = { startedAt: now, count: 0 };
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count > MAX_REQUESTS_PER_HOUR) {
    const error = new Error("Too many AI requests. Please try again later.");
    error.status = 429;
    error.code = "rate_limited";
    throw error;
  }
}
