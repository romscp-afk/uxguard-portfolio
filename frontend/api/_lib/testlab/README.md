# UXGuard TestLab

Product label: **TestLab** (subtitle: QA Autopilot).

## Architecture

- **Control plane** — Vercel serverless APIs + Blob JSON store (projects, targets, requirements, tests, runs, defects, schedules).
- **Execution plane** — Playwright workers. Vercel request handlers must **not** run long browser sessions.

```
UI → /api/v1/testlab/* → Blob store (queue runs as status=queued)
                              ↓
              scripts/testlab-worker.mjs  OR  TESTLAB_INLINE_EXECUTION=1
                              ↓
                         Playwright browsers
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `TESTLAB_INLINE_EXECUTION=1` | Process runs in-process after enqueue (local/dev). Also implied when `BLOB_READ_WRITE_TOKEN` is unset. |
| `TESTLAB_WORKER_TOKEN` | Shared secret for `POST /api/v1/testlab/worker/tick`. |
| `TESTLAB_DISABLE_WORKER=1` | Force 501 “worker not configured”. |
| `TESTLAB_SKIP_VERIFY=1` | With `UXGUARD_TEST=1`, skip live DNS/HTML verification in unit tests. |
| `OPENAI_API_KEY` | Optional; generation remains heuristic-first. |

## Worker

```bash
cd frontend
npm install
npx playwright install chromium firefox webkit
TESTLAB_WORKER_TOKEN=... node scripts/testlab-worker.mjs
```

The worker polls `POST /api/v1/testlab/worker/tick` (or processes the local store when running against memory/blob).

## Target verification

Methods: DNS TXT, `/.well-known/uxguard-testlab.txt`, or homepage meta tag `uxguard-testlab-verification`.

Production targets default to read-only exploration (no form submit).

## CI integration

```bash
curl -X POST "$HOST/api/v1/testlab/projects/$PROJECT_ID/ci" \\
  -H "Authorization: Bearer $JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"commit_sha":"abc","branch":"main","visual":true,"responsive":true}'
```

## Visual baselines

First visual run creates baselines. Later runs compare screenshots (sampled byte diff). Accept/overwrite via `POST .../baselines`.

## Secrets for authenticated runs

Store `LOGIN_USER` / `LOGIN_PASS` (or `AUTH_HEADER`). Enable **authenticated** on the run, or use a `login` step.
