/**
 * Execution provider interface for TestLab.
 * Prefer in-process execution so create → run completes without a separate worker.
 * Playwright is used when available; the runner falls back to HTTP smoke checks.
 */

export class NotConfiguredProvider {
  constructor(reason = "Playwright worker is not configured for this environment") {
    this.reason = reason;
  }

  getCapabilities() {
    return {
      configured: false,
      browsers: [],
      inline: false,
      reason: this.reason,
    };
  }

  async enqueueRun() {
    const err = new Error(this.reason);
    err.status = 501;
    err.code = "TESTLAB_WORKER_NOT_CONFIGURED";
    throw err;
  }

  async cancelRun() {
    const err = new Error(this.reason);
    err.status = 501;
    throw err;
  }
}

export class QueueProvider {
  constructor(options = {}) {
    this.inline = Boolean(options.inline);
  }

  getCapabilities() {
    return {
      configured: true,
      browsers: ["chromium", "firefox", "webkit"],
      inline: this.inline,
      reason: this.inline
        ? "Runs execute automatically after you click Run (Playwright when available, otherwise HTTP smoke checks)"
        : "Runs are queued for the TestLab worker — start scripts/testlab-worker.mjs or set TESTLAB_INLINE_EXECUTION=1",
    };
  }

  async enqueueRun(run) {
    return run;
  }

  async cancelRun(run) {
    return { ...run, cancel_requested: true };
  }
}

export function resolveExecutionProvider() {
  if (process.env.TESTLAB_DISABLE_WORKER === "1") {
    return new NotConfiguredProvider(
      "TestLab worker disabled (TESTLAB_DISABLE_WORKER=1). Set TESTLAB_INLINE_EXECUTION=1 or run scripts/testlab-worker.mjs.",
    );
  }

  // Default to inline so the product flow works on Vercel without an external worker.
  // Opt out with TESTLAB_INLINE_EXECUTION=0 to force queue-only + worker.
  const forceQueueOnly = process.env.TESTLAB_INLINE_EXECUTION === "0";
  const inline =
    !forceQueueOnly &&
    (process.env.TESTLAB_INLINE_EXECUTION === "1" ||
      process.env.UXGUARD_TEST === "1" ||
      !process.env.BLOB_READ_WRITE_TOKEN ||
      Boolean(process.env.VERCEL));

  return new QueueProvider({ inline });
}
