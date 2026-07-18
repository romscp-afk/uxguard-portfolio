import { createHash } from "node:crypto";
import { uid } from "./schema.js";

export function screenshotFingerprint(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Lightweight visual diff without native image libs:
 * compare length + sampled byte equality ratio on PNG buffers.
 */
export function compareScreenshotBuffers(baselineBuf, currentBuf, threshold = 0.02) {
  if (!baselineBuf?.length || !currentBuf?.length) {
    return { match: false, diff_ratio: 1, reason: "missing_buffer" };
  }
  if (baselineBuf.length === currentBuf.length) {
    let mismatches = 0;
    const step = Math.max(1, Math.floor(baselineBuf.length / 4000));
    let samples = 0;
    for (let i = 0; i < baselineBuf.length; i += step) {
      samples += 1;
      if (baselineBuf[i] !== currentBuf[i]) mismatches += 1;
    }
    const diff_ratio = samples ? mismatches / samples : 1;
    return {
      match: diff_ratio <= threshold,
      diff_ratio: Number(diff_ratio.toFixed(4)),
      threshold,
      baseline_bytes: baselineBuf.length,
      current_bytes: currentBuf.length,
    };
  }

  const lenRatio =
    Math.abs(baselineBuf.length - currentBuf.length) /
    Math.max(baselineBuf.length, currentBuf.length);
  return {
    match: false,
    diff_ratio: Number(Math.min(1, Math.max(lenRatio, 0.15)).toFixed(4)),
    threshold,
    baseline_bytes: baselineBuf.length,
    current_bytes: currentBuf.length,
    reason: "size_mismatch",
  };
}

export function normalizeBaseline(input) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  return {
    id: String(raw.id || uid("base")),
    project_id: String(raw.project_id || ""),
    test_case_id: String(raw.test_case_id || ""),
    browser: String(raw.browser || "chromium"),
    viewport_name: String(raw.viewport_name || "desktop"),
    fingerprint: String(raw.fingerprint || ""),
    data_url: String(raw.data_url || "").slice(0, 500000),
    updated_at: raw.updated_at || now,
    created_at: raw.created_at || now,
  };
}

export function baselineKey(testCaseId, browser, viewportName) {
  return `${testCaseId}::${browser}::${viewportName || "desktop"}`;
}
