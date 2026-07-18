/**
 * Execution provider interface for TestLab.
 * Vercel request handlers must not run long Playwright sessions —
 * workers claim queued runs via tick / CLI.
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
        ? "Inline Playwright execution enabled"
        : "Runs are queued for the TestLab worker",
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
  const inline =
    process.env.TESTLAB_INLINE_EXECUTION === "1" ||
    process.env.UXGUARD_TEST === "1" ||
    !process.env.BLOB_READ_WRITE_TOKEN;

  if (process.env.TESTLAB_DISABLE_WORKER === "1") {
    return new NotConfiguredProvider(
      "TestLab worker disabled (TESTLAB_DISABLE_WORKER=1). Set TESTLAB_INLINE_EXECUTION=1 or run scripts/testlab-worker.mjs.",
    );
  }

  return new QueueProvider({ inline });
}
