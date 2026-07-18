import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard } from "../../components/platform/ReadOnlyNotice";
import type { JobApplication } from "../../types";

const STAGES = [
  "submitted",
  "viewed",
  "under_review",
  "shortlisted",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
];

export function EmployerApplicationsPage() {
  const { jobId } = useParams();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listEmployerJobApplications(Number(jobId), stage || undefined);
      setApps(data.applications || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [jobId, stage]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link to={`/admin/employer/jobs/${jobId}`} className="inline-flex items-center gap-2 text-sm text-ink-600">
          <ArrowLeft className="h-4 w-4" /> Back to job
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-950">Applications</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={`rounded-lg px-3 py-1.5 text-xs ${!stage ? "bg-brand-600 text-white" : "bg-ink-100"}`} onClick={() => setStage("")}>
          All
        </button>
        {STAGES.map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs capitalize ${stage === s ? "bg-brand-600 text-white" : "bg-ink-100"}`}
            onClick={() => setStage(s)}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : apps.length === 0 ? (
        <p className="text-sm text-ink-500">No applications in this stage.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-ink-50 hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/employer/applications/${app.id}`} className="font-medium text-brand-700 hover:underline">
                      {app.candidate_name || "Candidate"}
                    </Link>
                    <p className="text-xs text-ink-500">{app.headline}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{app.latest_role || "—"}</td>
                  <td className="px-4 py-3">{app.match_percent != null ? `${app.match_percent}%` : "—"}</td>
                  <td className="px-4 py-3 capitalize">{(app.status || "").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function EmployerApplicationDetailPage() {
  const { applicationId } = useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getApplication>> | null>(null);
  const [stage, setStage] = useState("under_review");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const result = await api.getApplication(Number(applicationId));
      setData(result);
      setStage(result.application.status || "under_review");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load application.");
    }
  }

  useEffect(() => {
    void load();
  }, [applicationId]);

  async function saveStage() {
    setBusy(true);
    try {
      await api.updateApplicationStage(Number(applicationId), { status: stage });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    setBusy(true);
    try {
      await api.addApplicationNote(Number(applicationId), note);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add note.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return error ? <p className="text-sm text-red-600">{error}</p> : (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const app = data.application;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to={`/admin/employer/jobs/${app.job_id}/applications`} className="inline-flex items-center gap-2 text-sm text-ink-600">
        <ArrowLeft className="h-4 w-4" /> Applications
      </Link>
      <h1 className="font-display text-3xl font-bold text-ink-950">
        {data.candidate?.name || app.candidate_name || "Candidate"}
      </h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-ink-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Submitted resume snapshot</h2>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-ink-50 p-3 text-xs text-ink-700">
              {JSON.stringify(
                (data.resume_snapshot as { basics?: unknown } | null | undefined)?.basics || {},
                null,
                2,
              )}
            </pre>
          </section>
          <section className="rounded-xl border border-ink-200 bg-white p-4">
            <h2 className="text-sm font-semibold">Approved career timeline</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {(data.career_profile_snapshot as { entries?: Array<{ title: string; organisation: string }> })?.entries?.map((e, i) => (
                <li key={i} className="rounded border border-ink-100 px-3 py-2">
                  {e.title} · {e.organisation}
                </li>
              )) || <li className="text-ink-500">No timeline shared</li>}
            </ul>
          </section>
          {app.cover_letter ? (
            <section className="rounded-xl border border-ink-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Cover letter</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{app.cover_letter}</p>
            </section>
          ) : null}
        </div>
        <div className="space-y-4">
          <EditGuard>
            <section className="rounded-xl border border-ink-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Stage</h2>
              <select className="input-field mt-2" value={stage} onChange={(e) => setStage(e.target.value)}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
              <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={() => void saveStage()}>
                Update stage
              </button>
              {app.match_summary ? (
                <p className="mt-3 text-xs text-ink-500">
                  Match {app.match_summary.percent}% — {app.match_summary.disclaimer}
                </p>
              ) : null}
            </section>
            <section className="rounded-xl border border-ink-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Internal notes</h2>
              <p className="mt-1 text-xs text-ink-500">Never visible to candidates.</p>
              <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-sm">
                {(data.notes as Array<{ id: number; note: string }> | undefined)?.map((n) => (
                  <li key={n.id} className="rounded bg-ink-50 px-2 py-1">{n.note}</li>
                ))}
              </ul>
              <textarea className="input-field mt-2 min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="button" className="btn-secondary mt-2 w-full" disabled={busy || !note.trim()} onClick={() => void saveNote()}>
                Add note
              </button>
            </section>
          </EditGuard>
        </div>
      </div>
    </div>
  );
}
