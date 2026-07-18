import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Plus } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type { TestLabExecutionCapabilities, TestLabProject } from "../../types";

export function TestLabDashboardPage() {
  const [projects, setProjects] = useState<TestLabProject[]>([]);
  const [execution, setExecution] = useState<TestLabExecutionCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, status] = await Promise.all([api.listTestLabProjects(), api.testlabStatus()]);
      setProjects(list.projects || []);
      setExecution(status.execution);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load TestLab.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            QA Autopilot
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink">TestLab</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Generate, run, and track automated checks against verified staging and production
            targets. Complements human QA — does not replace it.
          </p>
        </div>
        <Link
          to="/admin/testlab/create"
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-800"
        >
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      {execution && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            execution.configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          <strong>Execution:</strong> {execution.reason}
          {execution.inline ? " (inline Playwright enabled for this environment)." : null}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-stone-500">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 px-6 py-16 text-center">
          <FlaskConical className="mx-auto h-10 w-10 text-stone-400" />
          <p className="mt-4 font-medium text-ink">No TestLab projects yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Create a project, add a verified target, then generate and run tests.
          </p>
          <Link
            to="/admin/testlab/create"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm text-white hover:bg-ink-800"
          >
            <Plus className="h-4 w-4" />
            Create project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/admin/testlab/${project.id}`}
              className="block rounded-lg border border-stone-200 bg-white p-5 transition hover:border-stone-400"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl text-ink">{project.name}</h2>
                <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-600">
                  {project.role || "member"}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-stone-600">
                {project.description || "No description"}
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-stone-500">
                <div>
                  <dt className="text-lg font-semibold text-ink">{project.target_count ?? 0}</dt>
                  <dd>Targets</dd>
                </div>
                <div>
                  <dt className="text-lg font-semibold text-ink">{project.test_count ?? 0}</dt>
                  <dd>Tests</dd>
                </div>
                <div>
                  <dt className="text-lg font-semibold text-ink">{project.open_defects ?? 0}</dt>
                  <dd>Defects</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
