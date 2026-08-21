import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Search } from "lucide-react";
import { api, ApiError } from "../../api/client";
import type { Job } from "../../types";

export function JobsBrowsePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [employment, setEmployment] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    setError("");
    try {
      const data = await api.searchJobs({
        q,
        workplace_type: workplace || undefined,
        employment_type: employment || undefined,
        verified_only: verifiedOnly ? "1" : undefined,
        page: nextPage,
        sort: "newest",
      });
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1);
  }, []);

  async function toggleSave(job: Job) {
    try {
      if (job.saved) await api.unsaveJob(job.id);
      else await api.saveJob(job.id);
      await load(page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update saved job.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Jobs</h1>
          <p className="mt-1 text-sm text-ink-500">Search roles and apply with your UXGuard resumes.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/applications" className="btn-secondary">My applications</Link>
          <Link to="/admin/saved-jobs" className="btn-secondary">Saved jobs</Link>
        </div>
      </div>

      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="input-field pl-9"
              placeholder="Keyword, title, company…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(1);
              }}
            />
          </div>
          <select className="input-field max-w-[10rem]" value={workplace} onChange={(e) => setWorkplace(e.target.value)}>
            <option value="">Workplace</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
          <select className="input-field max-w-[10rem]" value={employment} onChange={(e) => setEmployment(e.target.value)}>
            <option value="">Employment</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
            Verified employers
          </label>
          <button type="button" className="btn-primary" onClick={() => void load(1)}>Search</button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
          <p className="font-display text-xl text-ink-900">No jobs found</p>
          <p className="mt-2 text-sm text-ink-500">Try clearing filters or check back later.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-xl border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/admin/jobs/${job.id}`} className="font-display text-lg font-semibold text-ink-950 hover:text-brand-700">
                    {job.title}
                  </Link>
                  <p className="text-sm text-ink-600">
                    {job.company?.display_name || "Company"}
                    {job.verification_status === "verified" ? " · Verified" : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    {[job.city || job.location?.city, job.workplace_type, job.employment_type?.replace(/_/g, " ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {job.salary?.visible && (job.salary.min || job.salary.max) ? (
                    <p className="mt-1 text-xs text-ink-600">
                      {job.salary.currency} {job.salary.min || "?"}–{job.salary.max || "?"} / {job.salary.period}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary px-2 py-1" onClick={() => void toggleSave(job)} aria-label="Save job">
                    <Bookmark className={`h-4 w-4 ${job.saved ? "fill-brand-600 text-brand-600" : ""}`} />
                  </button>
                  <Link to={`/admin/jobs/${job.id}`} className="btn-primary text-sm">View</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 20 ? (
        <div className="flex justify-center gap-2">
          <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => void load(page - 1)}>Previous</button>
          <span className="self-center text-sm text-ink-500">Page {page}</span>
          <button type="button" className="btn-secondary" onClick={() => void load(page + 1)}>Next</button>
        </div>
      ) : null}
    </div>
  );
}
