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
    <div className="text-ink-900">
      <ReadOnlyNotice />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            QA Autopilot · Admin only
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink-950">TestLab</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            Create a project, add a staging target, save a page check, then run. Hidden from regular
            user accounts while we finish private testing.
          </p>
        </div>
        <Link
          to="/admin/testlab/create"
          className="inline-flex items-center gap-2 rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ink-800"
        >
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      {execution && (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            execution.configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          <strong>Execution:</strong> {execution.reason}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-red-900 underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-500">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center shadow-sm">
          <FlaskConical className="mx-auto h-10 w-10 text-ink-400" />
          <p className="mt-4 font-semibold text-ink-950">No TestLab projects yet</p>
          <p className="mt-1 text-sm text-ink-500">
            Create a project → add staging target → save a test → run.
          </p>
          <Link
            to="/admin/testlab/create"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-800"
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
              className="block rounded-xl border border-ink-200 bg-white p-5 shadow-sm transition hover:border-brand-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl text-ink-950">{project.name}</h2>
                <span className="rounded bg-ink-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-700">
                  {project.role || "member"}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-ink-600">
                {project.description || "No description"}
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-ink-500">
                <div>
                  <dt className="text-lg font-semibold text-ink-950">{project.target_count ?? 0}</dt>
                  <dd>Targets</dd>
                </div>
                <div>
                  <dt className="text-lg font-semibold text-ink-950">{project.test_count ?? 0}</dt>
                  <dd>Tests</dd>
                </div>
                <div>
                  <dt className="text-lg font-semibold text-ink-950">{project.open_defects ?? 0}</dt>
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
