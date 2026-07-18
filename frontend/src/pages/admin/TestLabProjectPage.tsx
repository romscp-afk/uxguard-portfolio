import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import { ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type {
  TestLabProjectDetail,
  TestLabResult,
  TestLabRun,
  TestLabVerificationChallenge,
} from "../../types";

const TABS = [
  "overview",
  "targets",
  "requirements",
  "tests",
  "runs",
  "defects",
  "schedules",
  "secrets",
  "recorder",
  "report",
] as const;

type Tab = (typeof TABS)[number];

export function TestLabProjectPage() {
  const { projectId = "" } = useParams();
  const [detail, setDetail] = useState<TestLabProjectDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<TestLabVerificationChallenge | null>(null);
  const [runDetail, setRunDetail] = useState<{ run: TestLabRun; results: TestLabResult[] } | null>(
    null,
  );

  // form state
  const [targetUrl, setTargetUrl] = useState("");
  const [targetEnv, setTargetEnv] = useState("staging");
  const [reqTitle, setReqTitle] = useState("");
  const [reqBody, setReqBody] = useState("");
  const [importText, setImportText] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [scheduleName, setScheduleName] = useState("Weekday regression");
  const [recorderJson, setRecorderJson] = useState(
    '[{"action":"goto","value":"/","description":"Open home"},{"action":"assert_visible","selector":"body"}]',
  );
  const [runOptions, setRunOptions] = useState({
    accessibility: true,
    performance: false,
    broken_links: false,
  });

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      setDetail(await api.getTestLabProject(projectId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load project.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !detail) {
    return <p className="text-sm text-stone-500">Loading TestLab project…</p>;
  }

  if (!detail) {
    return (
      <div>
        <Link to="/admin/testlab" className="text-sm text-stone-500">
          ← TestLab
        </Link>
        <p className="mt-4 text-red-700">{error || "Project not found"}</p>
      </div>
    );
  }

  const { project, targets, requirements, tests, runs, defects, schedules, secrets, execution, stats } =
    detail;
  const verifiedTarget = targets.find((t) => t.verification_status === "verified") || targets[0];

  return (
    <div>
      <ReadOnlyNotice />
      <Link to="/admin/testlab" className="text-sm text-stone-500 hover:text-ink">
        ← TestLab
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            QA Autopilot
          </p>
          <h1 className="font-display text-3xl text-ink">{project.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">{project.description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div
        className={`mt-4 rounded-md border px-4 py-3 text-sm ${
          execution.configured
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-950"
        }`}
      >
        {execution.configured ? (
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {execution.reason}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {execution.reason}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              tab === id ? "bg-ink text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-stone-200 p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  {key.replace(/_/g, " ")}
                </p>
                <p className="mt-1 font-display text-3xl text-ink">{value}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "targets" && (
          <div className="space-y-6">
            <form
              className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void withBusy(async () => {
                  await api.addTestLabTarget(projectId, {
                    base_url: targetUrl,
                    environment: targetEnv,
                    label: targetEnv,
                  });
                  setTargetUrl("");
                });
              }}
            >
              <label className="min-w-[240px] flex-1 text-sm">
                Base URL
                <input
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://staging.example.com"
                  required
                />
              </label>
              <label className="text-sm">
                Environment
                <select
                  className="mt-1 block rounded-md border border-stone-300 px-3 py-2"
                  value={targetEnv}
                  onChange={(e) => setTargetEnv(e.target.value)}
                >
                  <option value="staging">staging</option>
                  <option value="preview">preview</option>
                  <option value="production">production</option>
                  <option value="development">development</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Add target
              </button>
            </form>

            {challenge && (
              <div className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
                <p className="font-medium">Verification challenge</p>
                <p className="mt-2 whitespace-pre-wrap">{challenge.instructions}</p>
                <button
                  type="button"
                  className="mt-3 rounded-md bg-ink px-3 py-1.5 text-white"
                  disabled={busy}
                  onClick={() =>
                    void withBusy(async () => {
                      await api.confirmTestLabVerification(challenge.target_id);
                      setChallenge(null);
                    })
                  }
                >
                  Confirm ownership
                </button>
              </div>
            )}

            <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
              {targets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-ink">{t.label}</p>
                    <p className="text-sm text-stone-600">{t.base_url}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">
                      {t.environment} · {t.verification_status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
                      onClick={() =>
                        void withBusy(async () => {
                          const { challenge: c } = await api.startTestLabVerification(
                            t.id,
                            "meta_tag",
                          );
                          setChallenge(c);
                        })
                      }
                    >
                      Verify
                    </button>
                  </div>
                </li>
              ))}
              {!targets.length && (
                <li className="p-4 text-sm text-stone-500">No targets yet.</li>
              )}
            </ul>
          </div>
        )}

        {tab === "requirements" && (
          <div className="space-y-6">
            <form
              className="space-y-3 rounded-lg border border-stone-200 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void withBusy(async () => {
                  await api.createTestLabRequirement(projectId, {
                    title: reqTitle,
                    description: reqBody,
                    acceptance_criteria: reqBody
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean),
                  });
                  setReqTitle("");
                  setReqBody("");
                });
              }}
            >
              <input
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder="Requirement title"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                required
              />
              <textarea
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                rows={4}
                placeholder="Description / acceptance criteria (one per line)"
                value={reqBody}
                onChange={(e) => setReqBody(e.target.value)}
              />
              <button type="submit" disabled={busy} className="rounded-md bg-ink px-4 py-2 text-sm text-white">
                Add requirement
              </button>
            </form>

            <div className="rounded-lg border border-stone-200 p-4">
              <p className="text-sm font-medium">Import requirements</p>
              <textarea
                className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                rows={5}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste user stories or requirement bullets…"
              />
              <button
                type="button"
                disabled={busy || !importText.trim()}
                className="mt-2 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
                onClick={() =>
                  void withBusy(async () => {
                    await api.importTestLabRequirements(projectId, importText);
                    setImportText("");
                  })
                }
              >
                Import
              </button>
            </div>

            <ul className="space-y-3">
              {requirements.map((r) => (
                <li key={r.id} className="rounded-lg border border-stone-200 p-4">
                  <p className="font-medium">{r.title}</p>
                  <p className="mt-1 text-sm text-stone-600">{r.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "tests" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !requirements.length}
                className="rounded-md bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() =>
                  void withBusy(async () => {
                    await api.generateTestLabTests(projectId, {
                      requirement_ids: requirements.map((r) => r.id),
                    });
                  })
                }
              >
                Generate from requirements
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm"
                onClick={() =>
                  void withBusy(async () => {
                    await api.createTestLabTest(projectId, {
                      title: testTitle || "Manual smoke",
                      type: "smoke",
                      steps: [
                        { id: "1", action: "goto", value: "/", selector: "", assertion: "", description: "Open" },
                        {
                          id: "2",
                          action: "assert_visible",
                          selector: "body",
                          value: "",
                          assertion: "",
                          description: "Visible",
                        },
                      ],
                    });
                    setTestTitle("");
                  })
                }
              >
                Add manual smoke test
              </button>
              <input
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder="Manual test title"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
              />
            </div>

            <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
              {tests.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs uppercase tracking-wide text-stone-500">
                      {t.type} · {t.priority} · {t.generated_by} · {t.steps?.length || 0} steps
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-red-700"
                    disabled={busy}
                    onClick={() => void withBusy(() => api.deleteTestLabTest(t.id).then(() => undefined))}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {!tests.length && <li className="p-4 text-sm text-stone-500">No tests yet.</li>}
            </ul>
          </div>
        )}

        {tab === "runs" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-stone-200 p-4">
              <p className="text-sm font-medium">Start run</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {(["accessibility", "performance", "broken_links"] as const).map((key) => (
                  <label key={key} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={runOptions[key]}
                      onChange={(e) => setRunOptions((o) => ({ ...o, [key]: e.target.checked }))}
                    />
                    {key.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={busy || !verifiedTarget || !tests.length}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() =>
                  void withBusy(async () => {
                    const { run } = await api.createTestLabRun(projectId, {
                      target_id: verifiedTarget.id,
                      browsers: project.default_browsers || ["chromium"],
                      options: runOptions,
                    });
                    // Poll briefly for inline execution
                    for (let i = 0; i < 20; i++) {
                      await new Promise((r) => setTimeout(r, 1000));
                      const data = await api.getTestLabRun(run.id);
                      setRunDetail(data);
                      if (!["queued", "running"].includes(data.run.status)) break;
                    }
                  })
                }
              >
                <Play className="h-4 w-4" />
                Run all enabled tests
              </button>
              {!verifiedTarget && (
                <p className="mt-2 text-sm text-amber-800">Add a target before running.</p>
              )}
            </div>

            {runDetail && (
              <div className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    Run {runDetail.run.id} · {runDetail.run.status}
                  </p>
                  {["queued", "running"].includes(runDetail.run.status) && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
                      onClick={() =>
                        void withBusy(async () => {
                          await api.cancelTestLabRun(runDetail.run.id);
                          setRunDetail(await api.getTestLabRun(runDetail.run.id));
                        })
                      }
                    >
                      <Square className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-600">
                  passed {runDetail.run.summary?.passed ?? 0} / failed{" "}
                  {runDetail.run.summary?.failed ?? 0} / total {runDetail.run.summary?.total ?? 0}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {runDetail.results.map((r) => (
                    <li key={r.id} className="rounded border border-stone-100 px-3 py-2">
                      <span className="font-medium">{r.status}</span> · {r.browser} ·{" "}
                      {r.duration_ms}ms
                      {r.error_message ? ` — ${r.error_message}` : ""}
                      {r.screenshots?.[0]?.data_url ? (
                        <img
                          src={r.screenshots[0].data_url}
                          alt="Screenshot"
                          className="mt-2 max-h-40 rounded border border-stone-200"
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() =>
                      void api.getTestLabRun(r.id).then(setRunDetail).catch((err) => {
                        setError(err instanceof ApiError ? err.message : "Failed to load run");
                      })
                    }
                  >
                    <span className="font-medium">{r.status}</span>
                    <span className="text-stone-500"> · {r.id}</span>
                  </button>
                  <span className="text-stone-500">{r.created_at?.slice(0, 19)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "defects" && (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
            {defects.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs uppercase text-stone-500">
                    {d.severity} · {d.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
                    disabled={busy}
                    onClick={() =>
                      void withBusy(async () => {
                        await api.updateTestLabDefect(d.id, { status: "fixed" });
                      })
                    }
                  >
                    Mark fixed
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-ink px-3 py-1.5 text-sm text-white"
                    disabled={busy}
                    onClick={() =>
                      void withBusy(async () => {
                        await api.retestTestLabDefect(d.id);
                      })
                    }
                  >
                    Retest
                  </button>
                </div>
              </li>
            ))}
            {!defects.length && <li className="p-4 text-sm text-stone-500">No defects yet.</li>}
          </ul>
        )}

        {tab === "schedules" && (
          <div className="space-y-4">
            <form
              className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!verifiedTarget) return;
                void withBusy(async () => {
                  await api.createTestLabSchedule(projectId, {
                    name: scheduleName,
                    cron: "0 9 * * 1-5",
                    target_id: verifiedTarget.id,
                    test_case_ids: tests.map((t) => t.id),
                  });
                });
              }}
            >
              <input
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
              />
              <button type="submit" disabled={busy || !verifiedTarget} className="rounded-md bg-ink px-4 py-2 text-sm text-white">
                Add weekday 09:00 UTC schedule
              </button>
            </form>
            <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
              {schedules.map((s) => (
                <li key={s.id} className="flex items-center justify-between p-4 text-sm">
                  <span>
                    {s.name} · <code>{s.cron}</code> · {s.enabled ? "enabled" : "paused"}
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-stone-300 px-3 py-1.5"
                    onClick={() =>
                      void withBusy(async () => {
                        await api.updateTestLabSchedule(s.id, { enabled: !s.enabled });
                      })
                    }
                  >
                    {s.enabled ? "Pause" : "Enable"}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-stone-500">
              Schedules are stored in the control plane. Triggering uses the Playwright worker tick
              (or inline execution in local/dev).
            </p>
          </div>
        )}

        {tab === "secrets" && (
          <div className="space-y-4">
            <form
              className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void withBusy(async () => {
                  await api.upsertTestLabSecret(projectId, {
                    key: secretKey,
                    value: secretValue,
                  });
                  setSecretKey("");
                  setSecretValue("");
                });
              }}
            >
              <input
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder="KEY"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
              <input
                type="password"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm"
                placeholder="Value"
                value={secretValue}
                onChange={(e) => setSecretValue(e.target.value)}
                required
              />
              <button type="submit" disabled={busy} className="rounded-md bg-ink px-4 py-2 text-sm text-white">
                Save secret
              </button>
            </form>
            <ul className="rounded-lg border border-stone-200 divide-y">
              {secrets.map((s) => (
                <li key={s.id} className="px-4 py-3 text-sm">
                  <code>{s.key}</code> · {s.has_value ? "set" : "empty"}
                </li>
              ))}
            </ul>
            <p className="text-xs text-stone-500">
              Values are never returned by the API. Use AUTH_HEADER for authenticated runs.
            </p>
          </div>
        )}

        {tab === "recorder" && (
          <div className="space-y-3 rounded-lg border border-stone-200 p-4">
            <p className="text-sm text-stone-600">
              Paste recorded steps as JSON (action, selector, value). Browser extension capture can
              feed this endpoint later.
            </p>
            <textarea
              className="w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-xs"
              rows={10}
              value={recorderJson}
              onChange={(e) => setRecorderJson(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              className="rounded-md bg-ink px-4 py-2 text-sm text-white"
              onClick={() =>
                void withBusy(async () => {
                  const steps = JSON.parse(recorderJson);
                  await api.saveTestLabRecorder(projectId, {
                    title: "Recorded workflow",
                    steps,
                  });
                  setTab("tests");
                })
              }
            >
              Save as test case
            </button>
          </div>
        )}

        {tab === "report" && <ReportPanel projectId={projectId} />}
      </div>
    </div>
  );
}

function ReportPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getTestLabReport>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getTestLabReport(projectId)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed"));
  }, [projectId]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-stone-500">Loading report…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Runs", data.executive.total_runs],
          ["Pass rate", data.executive.pass_rate == null ? "—" : `${data.executive.pass_rate}%`],
          ["Open defects", data.executive.open_defects],
          ["Req coverage", data.executive.coverage == null ? "—" : `${data.executive.coverage}%`],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-stone-200 p-4">
            <p className="text-xs uppercase text-stone-500">{label}</p>
            <p className="mt-1 font-display text-2xl">{value}</p>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-medium">Recent failing results</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {data.technical.failing_tests.map((r) => (
            <li key={r.id} className="rounded border border-stone-200 px-3 py-2">
              {(r as TestLabResult & { test_title?: string }).test_title || r.test_case_id}:{" "}
              {r.error_message}
            </li>
          ))}
          {!data.technical.failing_tests.length && (
            <li className="text-stone-500">No failures recorded.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
