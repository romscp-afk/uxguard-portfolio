import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Briefcase, Plus, Users } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { EditGuard, EditLink, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type { EmployerDashboard } from "../../types";

export function EmployerWorkspacePage() {
  const { user, refreshUser } = useAuth();
  const [dashboard, setDashboard] = useState<EmployerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    legal_name: "",
    display_name: "",
    industry: "",
    website: "",
    contact_email: user?.email || "",
    description: "",
    terms_accepted: false,
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (!user?.workspaces?.employer) {
        await api.enableEmployerWorkspace();
        await refreshUser();
      }
      const data = await api.getEmployerDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load employer dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCompany() {
    setBusy(true);
    setError("");
    try {
      await api.createCompany(form);
      await refreshUser();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create company.");
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

  if (!dashboard?.company) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Create Employer Account</h1>
          <p className="mt-1 text-sm text-ink-500">
            Set up your company profile. Verification is controlled by platform admins — you cannot self-verify.
          </p>
        </div>
        <ReadOnlyNotice />
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <EditGuard>
          <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
            {(
              [
                ["legal_name", "Legal company name"],
                ["display_name", "Display name"],
                ["industry", "Industry"],
                ["website", "Website"],
                ["contact_email", "Contact email"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block font-medium text-ink-800">{label}</span>
                <input
                  className="input-field"
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-800">Company description</span>
              <textarea
                className="input-field min-h-[100px]"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label className="inline-flex items-start gap-2 text-sm text-ink-800">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.terms_accepted}
                onChange={(e) => setForm((prev) => ({ ...prev, terms_accepted: e.target.checked }))}
              />
              I accept the employer terms and confirm company details are accurate.
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !form.terms_accepted}
              onClick={() => void createCompany()}
            >
              {busy ? "Creating…" : "Submit company profile"}
            </button>
          </div>
        </EditGuard>
      </div>
    );
  }

  const { company, stats, jobs, recent_applications } = dashboard;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Employer Dashboard</h1>
          <p className="mt-1 text-sm text-ink-500">
            {company.display_name} ·{" "}
            <span className="capitalize">{company.verification_status}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditLink
            to={`/admin/employer/jobs/new?companyId=${company.id}`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Post a Job
          </EditLink>
          <Link to={`/admin/employer/company/${company.id}`} className="btn-secondary inline-flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Company profile
          </Link>
          <Link to={`/admin/employer/company/${company.id}/team`} className="btn-secondary inline-flex items-center gap-2">
            <Users className="h-4 w-4" /> Team
          </Link>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active jobs" value={stats.active_jobs} />
          <Stat label="Drafts" value={stats.draft_jobs} />
          <Stat label="Applications" value={stats.total_applications} />
          <Stat label="New" value={stats.new_applications} />
          <Stat label="Shortlisted" value={stats.shortlisted} />
          <Stat label="Interviews" value={stats.interviews} />
          <Stat label="Hires" value={stats.hires} />
          <Stat label="Closed" value={stats.closed_jobs} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-ink-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-ink-900">Jobs</h2>
          {jobs.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No jobs yet. Post your first opening.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {jobs.slice(0, 8).map((job) => (
                <li key={job.id}>
                  <Link
                    to={`/admin/employer/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm hover:bg-ink-50"
                  >
                    <span className="font-medium text-ink-900">{job.title || "Untitled job"}</span>
                    <span className="capitalize text-ink-500">{job.status.replace(/_/g, " ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-ink-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-ink-900">Recent applications</h2>
          {recent_applications.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No applications yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recent_applications.map((app) => (
                <li key={app.id}>
                  <Link
                    to={`/admin/employer/applications/${app.id}`}
                    className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm hover:bg-ink-50"
                  >
                    <span className="inline-flex items-center gap-2 text-ink-900">
                      <Briefcase className="h-3.5 w-3.5" /> Job #{app.job_id}
                    </span>
                    <span className="capitalize text-ink-500">{app.status.replace(/_/g, " ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink-950">{value}</p>
    </div>
  );
}
