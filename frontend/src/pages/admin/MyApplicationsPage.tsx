import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { JobApplication } from "../../types";

export function MyApplicationsPage() {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listMyApplications()
      .then((data) => setApps(data.applications || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load applications."))
      .finally(() => setLoading(false));
  }, []);

  async function withdraw(id: number) {
    if (!window.confirm("Withdraw this application?")) return;
    try {
      await api.withdrawApplication(id);
      const data = await api.listMyApplications();
      setApps(data.applications || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Withdraw failed.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-950">My Applications</h1>
        <p className="mt-1 text-sm text-ink-500">Track submissions. Internal employer notes are never shown here.</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
          <p className="font-display text-xl">No applications yet</p>
          <Link to="/admin/jobs" className="btn-primary mt-4 inline-flex">Browse jobs</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {apps.map((app) => (
            <li key={app.id} className="rounded-xl border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/admin/applications/${app.id}`} className="font-display text-lg font-semibold text-ink-950 hover:text-brand-700">
                    {app.job_title || `Job #${app.job_id}`}
                  </Link>
                  <p className="text-sm text-ink-600">{app.company_name}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Status: <span className="capitalize">{(app.status || "").replace(/_/g, " ")}</span>
                    {app.submitted_at ? ` · Submitted ${new Date(app.submitted_at).toLocaleDateString()}` : ""}
                  </p>
                  {app.next_action ? <p className="mt-1 text-xs text-brand-800">{app.next_action}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/applications/${app.id}`} className="btn-secondary text-sm">View</Link>
                  {app.status !== "withdrawn" && app.status !== "hired" ? (
                    <button type="button" className="btn-secondary text-sm text-red-700" onClick={() => void withdraw(app.id)}>
                      Withdraw
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
