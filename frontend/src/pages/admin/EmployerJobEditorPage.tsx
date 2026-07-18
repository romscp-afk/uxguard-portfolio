import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type { Job } from "../../types";

const STEPS = [
  "Basic information",
  "Job description",
  "Requirements",
  "Salary & benefits",
  "Screening questions",
  "Application settings",
  "Preview & publish",
];

export function EmployerJobEditorPage() {
  const { jobId } = useParams();
  const [params] = useSearchParams();
  const isNew = !jobId || jobId === "new";
  const navigate = useNavigate();
  const companyId = Number(params.get("companyId") || 0);
  const [job, setJob] = useState<Partial<Job>>({
    title: "",
    employment_type: "full_time",
    workplace_type: "hybrid",
    experience_level: "mid",
    resume_required: true,
    wizard_step: 1,
    salary: { visible: false, currency: "USD", min: null, max: null, period: "year" },
    required_skills: [],
    preferred_skills: [],
    responsibilities: [],
    questions: [],
    application_settings: { mode: "internal", allow_reapply: false },
  });
  const [step, setStep] = useState(1);
  const [skillsText, setSkillsText] = useState("");
  const [preferredText, setPreferredText] = useState("");
  const [respText, setRespText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolvedCompanyId, setResolvedCompanyId] = useState(companyId);

  useEffect(() => {
    async function boot() {
      if (isNew) {
        if (!companyId) {
          const dash = await api.getEmployerDashboard();
          if (dash.company?.id) setResolvedCompanyId(dash.company.id);
        }
        return;
      }
      try {
        const data = await api.getJob(Number(jobId));
        setJob(data.job);
        setStep(Number(data.job.wizard_step) || 1);
        setSkillsText((data.job.required_skills || []).join(", "));
        setPreferredText((data.job.preferred_skills || []).join(", "));
        setRespText((data.job.responsibilities || []).join("\n"));
        setResolvedCompanyId(data.job.company_id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load job.");
      }
    }
    void boot();
  }, [jobId, isNew, companyId]);

  const validation = useMemo(() => {
    const issues: string[] = [];
    if (!job.title) issues.push("Job title is required");
    if (!job.summary && !job.description) issues.push("Add a summary or description");
    const min = job.salary?.min;
    const max = job.salary?.max;
    if (min != null && max != null && Number(max) < Number(min)) {
      issues.push("Maximum salary cannot be lower than minimum");
    }
    return issues;
  }, [job]);

  async function persist(patch: Partial<Job> = {}, nextStep = step) {
    setSaving(true);
    setError("");
    const payload: Partial<Job> = {
      ...job,
      ...patch,
      wizard_step: nextStep,
      required_skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
      preferred_skills: preferredText.split(",").map((s) => s.trim()).filter(Boolean),
      responsibilities: respText.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (isNew || !job.id) {
        if (!resolvedCompanyId) throw new Error("Company required");
        const created = await api.createCompanyJob(resolvedCompanyId, payload);
        setJob(created.job);
        navigate(`/admin/employer/jobs/${created.job.id}`, { replace: true });
      } else {
        const updated = await api.updateJob(Number(job.id), payload);
        setJob(updated.job);
      }
      setStep(nextStep);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publish(action: "publish" | "submit_review" | "close" | "pause") {
    if (!job.id) {
      await persist({}, step);
    }
    const id = job.id;
    if (!id) return;
    setSaving(true);
    try {
      const result = await api.jobAction(Number(id), action);
      if (result.job) setJob(result.job);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/admin/employer" className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-900">
          <ArrowLeft className="h-4 w-4" /> Employer dashboard
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-950">
          {isNew && !job.id ? "Post a Job" : job.title || "Edit job"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">Step {step} of {STEPS.length}: {STEPS[step - 1]}</p>
      </div>

      <ReadOnlyNotice />
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`rounded-lg px-2 py-1 text-[11px] ${step === i + 1 ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}
            onClick={() => setStep(i + 1)}
          >
            {i + 1}. {label.split(" ")[0]}
          </button>
        ))}
      </div>

      <EditGuard>
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          {step === 1 ? (
            <>
              <Field label="Job title" value={job.title || ""} onChange={(v) => setJob((p) => ({ ...p, title: v }))} />
              <Field label="Department" value={job.department || ""} onChange={(v) => setJob((p) => ({ ...p, department: v }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Employment type"
                  value={job.employment_type || "full_time"}
                  options={["full_time", "part_time", "contract", "temporary", "internship", "freelance"]}
                  onChange={(v) => setJob((p) => ({ ...p, employment_type: v }))}
                />
                <Select
                  label="Experience level"
                  value={job.experience_level || "mid"}
                  options={["entry", "mid", "senior", "lead", "executive"]}
                  onChange={(v) => setJob((p) => ({ ...p, experience_level: v }))}
                />
                <Select
                  label="Workplace"
                  value={job.workplace_type || "hybrid"}
                  options={["onsite", "hybrid", "remote"]}
                  onChange={(v) => setJob((p) => ({ ...p, workplace_type: v }))}
                />
                <Field label="Vacancies" value={String(job.vacancies || 1)} onChange={(v) => setJob((p) => ({ ...p, vacancies: Number(v) || 1 }))} />
                <Field label="Country" value={job.country || ""} onChange={(v) => setJob((p) => ({ ...p, country: v }))} />
                <Field label="City" value={job.city || ""} onChange={(v) => setJob((p) => ({ ...p, city: v }))} />
                <Field label="Application deadline" value={job.deadline || ""} onChange={(v) => setJob((p) => ({ ...p, deadline: v }))} placeholder="YYYY-MM-DD" />
                <Field label="Expected start" value={job.expected_start_date || ""} onChange={(v) => setJob((p) => ({ ...p, expected_start_date: v }))} />
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Area label="Job summary" value={job.summary || ""} onChange={(v) => setJob((p) => ({ ...p, summary: v }))} />
              <Area label="Description" value={job.description || ""} onChange={(v) => setJob((p) => ({ ...p, description: v }))} />
              <Area label="Responsibilities (one per line)" value={respText} onChange={setRespText} />
              <Field label="Team information" value={job.team_info || ""} onChange={(v) => setJob((p) => ({ ...p, team_info: v }))} />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field label="Required skills (comma separated)" value={skillsText} onChange={setSkillsText} />
              <Field label="Preferred skills (comma separated)" value={preferredText} onChange={setPreferredText} />
              <Field
                label="Minimum experience (years)"
                value={job.min_experience_years == null ? "" : String(job.min_experience_years)}
                onChange={(v) =>
                  setJob((p) => ({ ...p, min_experience_years: v ? Number(v) : null }))
                }
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(job.resume_required)}
                  onChange={(e) => setJob((p) => ({ ...p, resume_required: e.target.checked }))}
                />
                Resume required
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(job.cover_letter_required)}
                  onChange={(e) => setJob((p) => ({ ...p, cover_letter_required: e.target.checked }))}
                />
                Cover letter required
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(job.portfolio_required)}
                  onChange={(e) => setJob((p) => ({ ...p, portfolio_required: e.target.checked }))}
                />
                Portfolio required
              </label>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(job.salary?.visible)}
                  onChange={(e) =>
                    setJob((p) => ({ ...p, salary: { ...p.salary, visible: e.target.checked } }))
                  }
                />
                Show salary publicly
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Currency"
                  value={job.salary?.currency || "USD"}
                  onChange={(v) => setJob((p) => ({ ...p, salary: { ...p.salary, currency: v } }))}
                />
                <Field
                  label="Period"
                  value={job.salary?.period || "year"}
                  onChange={(v) => setJob((p) => ({ ...p, salary: { ...p.salary, period: v } }))}
                />
                <Field
                  label="Minimum"
                  value={job.salary?.min == null ? "" : String(job.salary.min)}
                  onChange={(v) =>
                    setJob((p) => ({ ...p, salary: { ...p.salary, min: v ? Number(v) : null } }))
                  }
                />
                <Field
                  label="Maximum"
                  value={job.salary?.max == null ? "" : String(job.salary.max)}
                  onChange={(v) =>
                    setJob((p) => ({ ...p, salary: { ...p.salary, max: v ? Number(v) : null } }))
                  }
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(job.visa_sponsorship)}
                  onChange={(e) => setJob((p) => ({ ...p, visa_sponsorship: e.target.checked }))}
                />
                Visa sponsorship available
              </label>
            </>
          ) : null}

          {step === 5 ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">
                Add screening questions. Knockout rules should be reviewed before activation.
              </p>
              {(job.questions || []).map((q, index) => (
                <div key={q.id || index} className="rounded-lg border border-ink-100 p-3">
                  <Field
                    label="Question"
                    value={q.question}
                    onChange={(v) =>
                      setJob((p) => ({
                        ...p,
                        questions: (p.questions || []).map((item, i) =>
                          i === index ? { ...item, question: v } : item,
                        ),
                      }))
                    }
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(q.is_required)}
                      onChange={(e) =>
                        setJob((p) => ({
                          ...p,
                          questions: (p.questions || []).map((item, i) =>
                            i === index ? { ...item, is_required: e.target.checked } : item,
                          ),
                        }))
                      }
                    />
                    Required
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() =>
                  setJob((p) => ({
                    ...p,
                    questions: [
                      ...(p.questions || []),
                      {
                        id: `q_${Date.now()}`,
                        question: "",
                        type: "short_answer",
                        is_required: false,
                        is_knockout: false,
                      },
                    ],
                  }))
                }
              >
                Add question
              </button>
            </div>
          ) : null}

          {step === 6 ? (
            <>
              <Select
                label="Application mode"
                value={String(job.application_settings?.mode || "internal")}
                options={["internal", "external"]}
                onChange={(v) =>
                  setJob((p) => ({
                    ...p,
                    application_settings: { ...p.application_settings, mode: v },
                  }))
                }
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(job.application_settings?.allow_reapply)}
                  onChange={(e) =>
                    setJob((p) => ({
                      ...p,
                      application_settings: {
                        ...p.application_settings,
                        allow_reapply: e.target.checked,
                      },
                    }))
                  }
                />
                Allow reapplication
              </label>
            </>
          ) : null}

          {step === 7 ? (
            <div className="space-y-3 text-sm">
              <h2 className="font-display text-xl font-semibold text-ink-950">{job.title || "Untitled"}</h2>
              <p className="text-ink-600">{job.summary || job.description || "No description yet."}</p>
              <p className="capitalize text-ink-500">
                {job.employment_type?.replace(/_/g, " ")} · {job.workplace_type} · {job.city || "Location TBD"}
              </p>
              {validation.length ? (
                <ul className="list-disc pl-5 text-amber-800">
                  {validation.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-brand-800">Ready to publish or submit for review.</p>
              )}
              <p className="text-xs text-ink-500">Status: {job.status || "draft"}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            {step > 1 ? (
              <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : null}
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => void persist({}, Math.min(7, step + (step < 7 ? 1 : 0)))}
            >
              {saving ? "Saving…" : step < 7 ? "Save & continue" : "Save draft"}
            </button>
            {step === 7 ? (
              <>
                <button type="button" className="btn-secondary" disabled={saving || validation.length > 0} onClick={() => void publish("submit_review")}>
                  Submit for review
                </button>
                <button type="button" className="btn-primary" disabled={saving || validation.length > 0} onClick={() => void publish("publish")}>
                  Publish
                </button>
                {job.status === "published" ? (
                  <>
                    <button type="button" className="btn-secondary" onClick={() => void publish("pause")}>Pause</button>
                    <button type="button" className="btn-secondary" onClick={() => void publish("close")}>Close</button>
                  </>
                ) : null}
                {job.id ? (
                  <Link to={`/admin/employer/jobs/${job.id}/applications`} className="btn-secondary">
                    Manage applications
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </EditGuard>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink-800">{label}</span>
      <input className="input-field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink-800">{label}</span>
      <textarea className="input-field min-h-[100px]" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink-800">{label}</span>
      <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
