import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../../api/client";
import type { JobApplication } from "../../types";

export function ApplicationDetailPage() {
  const { applicationId } = useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getApplication>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getApplication(Number(applicationId))
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load application."));
  }, [applicationId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const app = data.application as JobApplication;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/admin/applications" className="inline-flex items-center gap-2 text-sm text-ink-600">
        <ArrowLeft className="h-4 w-4" /> My applications
      </Link>
      <h1 className="font-display text-3xl font-bold text-ink-950">
        {data.job?.title || app.job_title || "Application"}
      </h1>
      <p className="text-sm text-ink-600">{data.company?.display_name || app.company_name}</p>
      <p className="text-sm capitalize text-ink-500">
        Status: {(app.status || "").replace(/_/g, " ")}
      </p>

      <section className="rounded-xl border border-ink-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Submitted resume snapshot</h2>
        <p className="mt-1 text-xs text-ink-500">Immutable — later resume edits do not change this submission.</p>
        <pre className="mt-3 max-h-72 overflow-auto rounded bg-ink-50 p-3 text-xs">
          {JSON.stringify(
            {
              basics: (data.resume_snapshot as { basics?: unknown })?.basics,
              experience: ((data.resume_snapshot as { experience?: unknown[] })?.experience || []).slice(0, 3),
            },
            null,
            2,
          )}
        </pre>
      </section>

      {app.match_summary ? (
        <section className="rounded-xl border border-ink-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">Match guidance: {app.match_summary.percent}%</h2>
          <p className="mt-1 text-xs text-ink-500">{app.match_summary.disclaimer}</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-ink-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Status history</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-600">
          {(data.history as Array<{ new_stage: string; created_at: string }> | undefined)?.map((h, i) => (
            <li key={i} className="capitalize">
              {String(h.new_stage || "").replace(/_/g, " ")} · {new Date(h.created_at).toLocaleString()}
            </li>
          )) || <li>No history</li>}
        </ul>
      </section>
    </div>
  );
}

export function SavedJobsPage() {
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof api.listSavedJobs>>["jobs"]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listSavedJobs()
      .then((data) => setJobs(data.jobs || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load saved jobs."));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink-950">Saved jobs</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {jobs.length === 0 ? (
        <p className="text-sm text-ink-500">No saved jobs yet.</p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-xl border border-ink-200 bg-white p-4">
              <Link to={`/admin/jobs/${job.id}`} className="font-display text-lg font-semibold hover:text-brand-700">
                {job.title}
              </Link>
              <p className="text-sm text-ink-600">{job.company?.display_name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
