import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Flag } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type { Job, JobMatchSummary, ResumeSummary } from "../../types";

export function JobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [resumeId, setResumeId] = useState<number | "">("");
  const [coverLetter, setCoverLetter] = useState("");
  const [consent, setConsent] = useState(false);
  const [match, setMatch] = useState<JobMatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [jobData, resumeData] = await Promise.all([
          api.getJob(Number(jobId)),
          api.listResumes(),
        ]);
        setJob(jobData.job);
        setResumes(resumeData.resumes || []);
        if (resumeData.resumes?.[0]) setResumeId(resumeData.resumes[0].id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load job.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [jobId]);

  async function runMatch() {
    if (!resumeId || !jobId) return;
    setBusy(true);
    try {
      const data = await api.jobAction(Number(jobId), "match", { resume_id: Number(resumeId) });
      setMatch(data.match || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Match failed.");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!jobId || !resumeId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.applyToJob(Number(jobId), {
        resume_id: Number(resumeId),
        cover_letter: coverLetter,
        consent_accepted: consent,
      });
      setSuccess("Application submitted. Your resume snapshot is now locked for this application.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Application failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return <p className="text-sm text-red-600">{error || "Job not found"}</p>;
  }

  const closed = ["closed", "expired", "suspended", "paused", "archived"].includes(job.status);
  const external = job.application_settings?.mode === "external";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/admin/jobs" className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> All jobs
      </Link>

      <div>
        <h1 className="font-display text-3xl font-bold text-ink-950">{job.title}</h1>
        <p className="mt-1 text-sm text-ink-600">
          {job.company?.display_name || "Company"}
          {job.company?.verification_status === "verified" || job.verification_status === "verified"
            ? " · Verified employer"
            : " · Unverified employer"}
        </p>
        <p className="mt-2 text-sm text-ink-500">
          {[job.city, job.workplace_type, job.employment_type?.replace(/_/g, " "), job.experience_level]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {closed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This job is {job.status.replace(/_/g, " ")} and may not accept applications.
        </p>
      ) : null}
      {external ? (
        <p className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700">
          This role uses an external application URL.
          {typeof job.application_settings?.external_url === "string" ? (
            <>
              {" "}
              <a className="text-brand-700 underline" href={String(job.application_settings.external_url)} target="_blank" rel="noreferrer">
                Apply externally
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      <ReadOnlyNotice />
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">{success}</p> : null}

      <article className="space-y-4 rounded-xl border border-ink-200 bg-white p-5 text-sm text-ink-700">
        {job.summary ? <p>{job.summary}</p> : null}
        {job.description ? <p className="whitespace-pre-wrap">{job.description}</p> : null}
        {job.responsibilities?.length ? (
          <div>
            <h2 className="font-semibold text-ink-900">Responsibilities</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {job.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {job.required_skills?.length ? (
          <div>
            <h2 className="font-semibold text-ink-900">Required skills</h2>
            <p className="mt-1">{job.required_skills.join(", ")}</p>
          </div>
        ) : null}
        {job.salary?.visible ? (
          <p>
            Salary: {job.salary.currency} {job.salary.min || "?"}–{job.salary.max || "?"} / {job.salary.period}
          </p>
        ) : null}
      </article>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2"
          onClick={() => void (job.saved ? api.unsaveJob(job.id) : api.saveJob(job.id)).then(() => setJob((j) => (j ? { ...j, saved: !j.saved } : j)))}
        >
          <Bookmark className="h-4 w-4" /> {job.saved ? "Saved" : "Save job"}
        </button>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-2"
          onClick={() => void api.jobAction(job.id, "report", { reason: "spam", description: "Reported from job page" })}
        >
          <Flag className="h-4 w-4" /> Report job
        </button>
      </div>

      {!closed && !external ? (
        <EditGuard>
          <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
            <h2 className="font-display text-xl font-semibold text-ink-950">Apply now</h2>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Select resume</span>
              <select
                className="input-field"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Choose resume</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Cover letter</span>
              <textarea className="input-field min-h-[100px]" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
            </label>
            <label className="inline-flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              I confirm this information is accurate and the employer may view the submitted application data.
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" disabled={!resumeId || busy} onClick={() => void runMatch()}>
                Check match
              </button>
              <button type="button" className="btn-primary" disabled={!resumeId || !consent || busy} onClick={() => void apply()}>
                {busy ? "Submitting…" : "Submit application"}
              </button>
            </div>
            {match ? (
              <div className="rounded-lg border border-ink-100 bg-ink-50 p-3 text-sm">
                <p className="font-semibold text-ink-900">Match: {match.percent}%</p>
                <p className="mt-1 text-xs text-ink-500">{match.disclaimer}</p>
                {match.suggested_improvements?.length ? (
                  <ul className="mt-2 list-disc pl-5 text-ink-700">
                    {match.suggested_improvements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </EditGuard>
      ) : null}
    </div>
  );
}
