import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
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
  TestLabStep,
  TestLabVerificationChallenge,
} from "../../types";

const PRIMARY_TABS = ["overview", "targets", "tests", "runs"] as const;
const ADVANCED_TABS = [
  "requirements",
  "defects",
  "schedules",
  "secrets",
  "baselines",
  "traceability",
  "recorder",
  "report",
] as const;
const TABS = [...PRIMARY_TABS, ...ADVANCED_TABS] as const;

type Tab = (typeof TABS)[number];

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 shadow-sm transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50";
const card = "rounded-xl border border-ink-200 bg-white p-5 shadow-sm";
const field =
  "mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

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
  const [testPath, setTestPath] = useState("/");
  const [testAssert, setTestAssert] = useState("");
  const [showAdvancedBuilder, setShowAdvancedBuilder] = useState(false);
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
    visual: false,
    responsive: false,
    authenticated: false,
  });
  const [openapiText, setOpenapiText] = useState("");
  const [builderSteps, setBuilderSteps] = useState(
    '[{"action":"goto","value":"/","description":"Open"},{"action":"assert_visible","selector":"body","description":"Body visible"}]',
  );
  const [dataSetsJson, setDataSetsJson] = useState("[]");
  const [trace, setTrace] = useState<Awaited<ReturnType<typeof api.getTestLabTraceability>> | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!projectId || projectId === "new" || projectId === "create") return;
    setLoading(true);
    setError("");
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        setDetail(await api.getTestLabProject(projectId));
        setError("");
        return;
      } catch (err) {
        lastError = err;
        const notFound = err instanceof ApiError && err.status === 404;
        if (!notFound || attempt === 3) break;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    setError(
      lastError instanceof ApiError ? lastError.message : "Could not load project.",
    );
  }, [projectId]);

  useEffect(() => {
    if (projectId === "new" || projectId === "create") return;
    void load().finally(() => setLoading(false));
  }, [load, projectId]);

  if (projectId === "new" || projectId === "create") {
    return <Navigate to="/admin/testlab/create" replace />;
  }

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

  const { project, targets, requirements, tests, runs, defects, schedules, secrets, baselines = [], execution, stats } =
    detail;
  const stagingOrVerified =
    targets.find((t) => t.verification_status === "verified") ||
    targets.find((t) => t.environment !== "production") ||
    targets[0];
  const enabledTests = tests.filter((t) => t.enabled !== false);
  const step1Done = targets.length > 0;
  const step2Done = tests.length > 0;
  const step3Done = runs.some((r) => !["queued", "running"].includes(r.status));
  const canRun =
    Boolean(stagingOrVerified) &&
    enabledTests.length > 0 &&
    !(stagingOrVerified?.environment === "production" && stagingOrVerified.verification_status !== "verified");

  return (
    <div className="text-ink-900">
      <ReadOnlyNotice />
      <Link
        to="/admin/testlab"
        className="inline-flex text-sm font-medium text-ink-600 underline-offset-2 hover:text-ink-950 hover:underline"
      >
        ← TestLab
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            QA Autopilot · Admin testing
          </p>
          <h1 className="font-display text-3xl text-ink-950">{project.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-600">{project.description}</p>
        </div>
        <button type="button" onClick={() => void load()} className={btnSecondary}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div
        className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          execution.configured
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-amber-200 bg-amber-50 text-amber-950"
        }`}
      >
        {execution.configured ? (
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {execution.reason}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {execution.reason}
          </span>
        )}
      </div>

      <div className={`${card} mt-4`}>
        <p className="text-sm font-semibold text-ink-950">Guided flow</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            {
              n: 1,
              label: "Add a target URL",
              done: step1Done,
              tab: "targets" as Tab,
              hint: "Prefer staging for first runs",
            },
            {
              n: 2,
              label: "Add test cases",
              done: step2Done,
              tab: "tests" as Tab,
              hint: "Quick check or generate from requirements",
            },
            {
              n: 3,
              label: "Run tests",
              done: step3Done,
              tab: "runs" as Tab,
              hint: canRun ? "Ready to run" : "Needs target + tests",
            },
          ].map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => setTab(s.tab)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                s.done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-ink-200 bg-ink-50 hover:border-brand-300"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Step {s.n}</p>
              <p className="mt-1 font-medium text-ink-950">
                {s.done ? "✓ " : ""}
                {s.label}
              </p>
              <p className="mt-1 text-xs text-ink-600">{s.hint}</p>
            </button>
          ))}
        </ol>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-ink-200 pb-2">
        {PRIMARY_TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              tab === id
                ? "bg-ink-950 text-white"
                : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
            }`}
          >
            {id}
          </button>
        ))}
        <details className="relative">
          <summary
            className={`cursor-pointer list-none rounded-lg px-3 py-1.5 text-sm font-medium ${
              ADVANCED_TABS.includes(tab as (typeof ADVANCED_TABS)[number])
                ? "bg-ink-950 text-white"
                : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
            }`}
          >
            More ▾
          </summary>
          <div className="absolute z-10 mt-1 flex min-w-[12rem] flex-col gap-1 rounded-xl border border-ink-200 bg-white p-2 shadow-lg">
            {ADVANCED_TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-md px-3 py-1.5 text-left text-sm capitalize ${
                  tab === id ? "bg-ink-100 font-semibold text-ink-950" : "text-ink-700 hover:bg-ink-50"
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </details>
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className={card}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {key.replace(/_/g, " ")}
                </p>
                <p className="mt-1 font-display text-3xl text-ink-950">{value}</p>
              </div>
            ))}
            <div className={`${card} sm:col-span-2 lg:col-span-3`}>
              <p className="font-semibold text-ink-950">Next action</p>
              <p className="mt-1 text-sm text-ink-600">
                {!step1Done
                  ? "Add a staging target URL, then create a quick page check."
                  : !step2Done
                    ? "Add at least one test case, then run."
                    : canRun
                      ? "Everything looks ready — open Runs and start a run."
                      : "Verify production targets before running against them."}
              </p>
              <button
                type="button"
                className={`${btnPrimary} mt-4`}
                onClick={() =>
                  setTab(!step1Done ? "targets" : !step2Done ? "tests" : "runs")
                }
              >
                Continue setup
              </button>
            </div>
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
            <div className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink-950">Add a quick page check</h2>
                  <p className="mt-1 text-sm text-ink-600">
                    Opens a path on your target and optionally checks for text on the page.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy || !requirements.length}
                  className={btnSecondary}
                  title={
                    requirements.length
                      ? "Generate tests from requirements"
                      : "Add requirements in More → requirements first"
                  }
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
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-ink-800 sm:col-span-2">
                  Test title
                  <input
                    className={field}
                    placeholder="Home page loads"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                  />
                </label>
                <label className="text-sm font-medium text-ink-800">
                  Path
                  <input
                    className={field}
                    placeholder="/"
                    value={testPath}
                    onChange={(e) => setTestPath(e.target.value)}
                  />
                </label>
                <label className="text-sm font-medium text-ink-800">
                  Must contain text (optional)
                  <input
                    className={field}
                    placeholder="Welcome"
                    value={testAssert}
                    onChange={(e) => setTestAssert(e.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={busy}
                className={`${btnPrimary} mt-4`}
                onClick={() =>
                  void withBusy(async () => {
                    const path = testPath.trim() || "/";
                    const steps: Partial<TestLabStep>[] = [
                      { action: "goto", value: path, description: `Open ${path}` },
                      {
                        action: "assert_visible",
                        selector: "body",
                        description: "Page body visible",
                      },
                    ];
                    if (testAssert.trim()) {
                      steps.push({
                        action: "assert_text",
                        value: testAssert.trim(),
                        description: `Contains “${testAssert.trim()}”`,
                      });
                    }
                    await api.createTestLabTest(projectId, {
                      title: testTitle.trim() || `Check ${path}`,
                      type: "functional",
                      steps: steps as TestLabStep[],
                      data_sets: [],
                      generated_by: "manual",
                      enabled: true,
                    });
                    setTestTitle("");
                    setTestPath("/");
                    setTestAssert("");
                  })
                }
              >
                Save test case
              </button>
            </div>

            <div className={card}>
              <button
                type="button"
                className="text-sm font-semibold text-ink-800 underline-offset-2 hover:underline"
                onClick={() => setShowAdvancedBuilder((v) => !v)}
              >
                {showAdvancedBuilder ? "Hide" : "Show"} advanced JSON builder
              </button>
              {showAdvancedBuilder ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="block text-sm font-medium text-ink-800">
                      Steps (JSON)
                      <textarea
                        className={`${field} font-mono text-xs`}
                        rows={8}
                        value={builderSteps}
                        onChange={(e) => setBuilderSteps(e.target.value)}
                      />
                    </label>
                    <label className="block text-sm font-medium text-ink-800">
                      Data sets (JSON)
                      <textarea
                        className={`${field} font-mono text-xs`}
                        rows={8}
                        value={dataSetsJson}
                        onChange={(e) => setDataSetsJson(e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className={btnSecondary}
                    onClick={() =>
                      void withBusy(async () => {
                        let steps = [];
                        let data_sets = [];
                        try {
                          steps = JSON.parse(builderSteps);
                          data_sets = JSON.parse(dataSetsJson || "[]");
                        } catch {
                          throw new ApiError(400, "Invalid step or data-set JSON");
                        }
                        await api.createTestLabTest(projectId, {
                          title: testTitle || "Manual test",
                          type: "functional",
                          steps,
                          data_sets,
                          generated_by: "manual",
                        });
                        setTestTitle("");
                      })
                    }
                  >
                    Save from JSON
                  </button>
                  <div>
                    <p className="text-sm font-medium text-ink-800">OpenAPI / path list</p>
                    <textarea
                      className={`${field} font-mono text-xs`}
                      rows={4}
                      value={openapiText}
                      onChange={(e) => setOpenapiText(e.target.value)}
                      placeholder="Paste OpenAPI JSON or paths like /api/users"
                    />
                    <button
                      type="button"
                      disabled={busy || !openapiText.trim()}
                      className={`${btnSecondary} mt-2`}
                      onClick={() =>
                        void withBusy(async () => {
                          await api.generateTestLabTests(projectId, { openapi: openapiText });
                          setOpenapiText("");
                        })
                      }
                    >
                      Generate API tests
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
              {tests.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-ink-950">{t.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {t.type} · {t.priority} · {t.generated_by} · {t.steps?.length || 0} steps
                      {t.enabled === false ? " · disabled" : ""}
                      {(t.data_sets?.length ?? 0) > 0 ? ` · ${t.data_sets?.length} data sets` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm font-semibold text-red-700 hover:underline"
                    disabled={busy}
                    onClick={() =>
                      void withBusy(() => api.deleteTestLabTest(t.id).then(() => undefined))
                    }
                  >
                    Delete
                  </button>
                </li>
              ))}
              {!tests.length && (
                <li className="p-6 text-sm text-ink-500">
                  No tests yet. Save a quick page check above — it will appear here immediately.
                </li>
              )}
            </ul>

            {tests.length > 0 ? (
              <button type="button" className={btnPrimary} onClick={() => setTab("runs")}>
                Continue to Runs
              </button>
            ) : null}
          </div>
        )}

        {tab === "runs" && (
          <div className="space-y-6">
            <div className={card}>
              <h2 className="font-semibold text-ink-950">Start run</h2>
              <p className="mt-1 text-sm text-ink-600">
                Target:{" "}
                <strong className="text-ink-900">
                  {stagingOrVerified
                    ? `${stagingOrVerified.label} (${stagingOrVerified.base_url})`
                    : "none"}
                </strong>
                {" · "}
                {enabledTests.length} enabled test{enabledTests.length === 1 ? "" : "s"}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-800">
                {(
                  [
                    "accessibility",
                    "performance",
                    "broken_links",
                    "visual",
                    "responsive",
                    "authenticated",
                  ] as const
                ).map((key) => (
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
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !canRun}
                  className={btnPrimary}
                  onClick={() =>
                    void withBusy(async () => {
                      if (!stagingOrVerified) return;
                      const { run } = await api.createTestLabRun(projectId, {
                        target_id: stagingOrVerified.id,
                        browsers: project.default_browsers || ["chromium"],
                        options: runOptions,
                      });
                      let data = await api.getTestLabRun(run.id);
                      setRunDetail(data);
                      for (let i = 0; i < 45; i++) {
                        if (!["queued", "running"].includes(data.run.status)) break;
                        await new Promise((r) => setTimeout(r, 1000));
                        data = await api.getTestLabRun(run.id);
                        setRunDetail(data);
                      }
                    })
                  }
                >
                  <Play className="h-4 w-4" />
                  Run all enabled tests
                </button>
                <button
                  type="button"
                  disabled={busy || !stagingOrVerified}
                  className={btnSecondary}
                  onClick={() =>
                    void withBusy(async () => {
                      if (!stagingOrVerified) return;
                      const { run } = await api.triggerTestLabCi(projectId, {
                        target_id: stagingOrVerified.id,
                        visual: runOptions.visual,
                        responsive: runOptions.responsive,
                        broken_links: runOptions.broken_links,
                        performance: runOptions.performance,
                        authenticated: runOptions.authenticated,
                      });
                      setRunDetail(await api.getTestLabRun(run.id));
                    })
                  }
                >
                  Queue CI run
                </button>
              </div>
              {!canRun && (
                <p className="mt-3 text-sm text-amber-900">
                  {!stagingOrVerified
                    ? "Add a target before running."
                    : !enabledTests.length
                      ? "Add at least one test case before running."
                      : stagingOrVerified.environment === "production" &&
                          stagingOrVerified.verification_status !== "verified"
                        ? "Production targets must be verified before running."
                        : "Cannot run yet."}
                </p>
              )}
            </div>

            {runDetail && (
              <div className={card}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink-950">
                    Run {runDetail.run.id} ·{" "}
                    <span className="capitalize">{runDetail.run.status}</span>
                  </p>
                  {["queued", "running"].includes(runDetail.run.status) && (
                    <button
                      type="button"
                      className={btnSecondary}
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
                <p className="mt-1 text-sm text-ink-600">
                  passed {runDetail.run.summary?.passed ?? 0} / failed{" "}
                  {runDetail.run.summary?.failed ?? 0} / total {runDetail.run.summary?.total ?? 0}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-ink-800">
                  {runDetail.results.map((r) => (
                    <li key={r.id} className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2">
                      <span className="font-semibold capitalize text-ink-950">{r.status}</span> ·{" "}
                      {r.browser} · {r.duration_ms}ms
                      {r.error_message ? ` — ${r.error_message}` : ""}
                      {r.screenshots?.[0]?.data_url ? (
                        <img
                          src={r.screenshots[0].data_url}
                          alt="Screenshot"
                          className="mt-2 max-h-40 rounded border border-ink-200"
                        />
                      ) : null}
                    </li>
                  ))}
                  {!runDetail.results.length && (
                    <li className="text-ink-500">No result rows yet for this run.</li>
                  )}
                </ul>
              </div>
            )}

            <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <button
                    type="button"
                    className="text-left font-medium text-ink-900 hover:underline"
                    onClick={() =>
                      void api
                        .getTestLabRun(r.id)
                        .then(setRunDetail)
                        .catch((err) => {
                          setError(err instanceof ApiError ? err.message : "Failed to load run");
                        })
                    }
                  >
                    <span className="capitalize">{r.status}</span>
                    <span className="text-ink-500"> · {r.id}</span>
                  </button>
                  <span className="text-ink-500">{r.created_at?.slice(0, 19)}</span>
                </li>
              ))}
              {!runs.length && (
                <li className="p-6 text-sm text-ink-500">No runs yet.</li>
              )}
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
                if (!stagingOrVerified) return;
                void withBusy(async () => {
                  await api.createTestLabSchedule(projectId, {
                    name: scheduleName,
                    cron: "0 9 * * 1-5",
                    target_id: stagingOrVerified.id,
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
              <button type="submit" disabled={busy || !stagingOrVerified} className="rounded-md bg-ink px-4 py-2 text-sm text-white">
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

        {tab === "baselines" && (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
            {baselines.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">
                    {b.browser} / {b.viewport_name}
                  </p>
                  <p className="text-stone-500">
                    test {b.test_case_id} · {b.fingerprint.slice(0, 12)}…
                  </p>
                </div>
                {b.data_url ? (
                  <img src={b.data_url} alt="Baseline" className="max-h-24 rounded border border-stone-200" />
                ) : null}
              </li>
            ))}
            {!baselines.length && (
              <li className="p-4 text-sm text-stone-500">
                No baselines yet. Enable “visual” on a run to create them automatically.
              </li>
            )}
          </ul>
        )}

        {tab === "traceability" && (
          <div className="space-y-4">
            <button
              type="button"
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
              onClick={() =>
                void api
                  .getTestLabTraceability(projectId)
                  .then(setTrace)
                  .catch((err) =>
                    setError(err instanceof ApiError ? err.message : "Failed to load traceability"),
                  )
              }
            >
              Load matrix
            </button>
            {trace && (
              <>
                <p className="text-sm text-stone-600">
                  Uncovered requirements: {trace.uncovered_requirements.length} · Orphan tests:{" "}
                  {trace.orphan_tests.length}
                </p>
                <ul className="space-y-3">
                  {trace.matrix.map((row) => (
                    <li key={row.requirement.id} className="rounded-lg border border-stone-200 p-4">
                      <p className="font-medium">{row.requirement.title}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {row.tests.length
                          ? row.tests.map((t) => t.title).join(" · ")
                          : "No linked tests"}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
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
