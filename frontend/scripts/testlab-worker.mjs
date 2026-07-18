#!/usr/bin/env node
/**
 * TestLab Playwright worker — polls the control plane and executes queued runs.
 *
 * Usage:
 *   TESTLAB_API_BASE=https://uxguard.studio TESTLAB_WORKER_TOKEN=... node scripts/testlab-worker.mjs
 *
 * Local (memory/blob store in-process):
 *   TESTLAB_INLINE_EXECUTION=1  (API processes runs itself)
 *   or: UXGUARD_TEST=1 node -e "import('./api/_lib/testlab/service.js').then(m => m.claimAndProcessNextRun())"
 */

import { claimAndProcessNextRun } from "../api/_lib/testlab/service.js";

const INTERVAL_MS = Number(process.env.TESTLAB_WORKER_INTERVAL_MS || 5000);
const API_BASE = (process.env.TESTLAB_API_BASE || "").replace(/\/$/, "");
const TOKEN = process.env.TESTLAB_WORKER_TOKEN || "";

async function tickRemote() {
  const res = await fetch(`${API_BASE}/api/v1/testlab/worker/tick`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "x-testlab-worker-id": `cli_${process.pid}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || res.statusText);
  return body;
}

async function tickLocal() {
  const run = await claimAndProcessNextRun({ workerId: `cli_${process.pid}` });
  return { processed: Boolean(run), run };
}

async function loop() {
  console.log(`[testlab-worker] starting (api=${API_BASE || "local-store"})`);
  for (;;) {
    try {
      const result = API_BASE && TOKEN ? await tickRemote() : await tickLocal();
      if (result.processed) {
        console.log(`[testlab-worker] processed run ${result.run?.id} → ${result.run?.status}`);
      } else {
        process.stdout.write(".");
      }
    } catch (err) {
      console.error(`\n[testlab-worker] error: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

loop();
