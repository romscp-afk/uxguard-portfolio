import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Save,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { canEditPlatform } from "../../lib/roles";
import type {
  Resume,
  ResumeCertification,
  ResumeEducation,
  ResumeExperience,
  ResumeProjectItem,
  ResumeSkill,
  ResumeStatus,
} from "../../types";

type SectionId =
  | "meta"
  | "basics"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "preview";

type SaveState = "idle" | "saving" | "saved" | "failed";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "meta", label: "Resume details" },
  { id: "basics", label: "Basic information" },
  { id: "summary", label: "Professional summary" },
  { id: "experience", label: "Work experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "certifications", label: "Certifications" },
  { id: "languages", label: "Languages" },
  { id: "preview", label: "Preview" },
];

const SKILL_CATEGORIES = [
  "Product",
  "UX Research",
  "UX/UI Design",
  "Technical",
  "Leadership",
  "Project Management",
  "Communication",
  "Industry Knowledge",
  "Languages",
  "Other",
];

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function sectionComplete(resume: Resume, id: SectionId): boolean {
  if (id === "meta") return Boolean(resume.title);
  if (id === "basics")
    return Boolean(resume.basics?.name && (resume.basics.email || resume.basics.phone));
  if (id === "summary") return Boolean(resume.basics?.summary || resume.basics?.objective);
  if (id === "experience") return (resume.experience || []).length > 0;
  if (id === "education") return (resume.education || []).length > 0;
  if (id === "skills") return (resume.skills || []).length > 0;
  if (id === "projects") return (resume.projects || []).length > 0;
  if (id === "certifications") return (resume.certifications || []).length > 0;
  if (id === "languages") return (resume.languages || []).length > 0;
  return true;
}

export function ResumeEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const readOnly = !canEditPlatform(user);
  const resumeId = Number(id);

  const [resume, setResume] = useState<Resume | null>(null);
  const [section, setSection] = useState<SectionId>(
    searchParams.get("tab") === "preview" ? "preview" : "basics",
  );
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [skillDraft, setSkillDraft] = useState("");
  const [skillCategory, setSkillCategory] = useState("Other");

  const resumeRef = useRef<Resume | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(true);

  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);

  useEffect(() => {
    if (!Number.isFinite(resumeId) || resumeId <= 0) {
      navigate("/admin/resume-builder", { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getResume(resumeId)
      .then((data) => {
        if (cancelled) return;
        setResume(data.resume);
        setDirty(false);
        skipNextAutosave.current = true;
        setError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load resume.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resumeId, navigate]);

  const persist = useCallback(
    async (payload: Resume, { manual = false }: { manual?: boolean } = {}) => {
      if (readOnly) return;
      setSaveState("saving");
      setError("");
      try {
        const status: ResumeStatus =
          payload.completion_percentage >= 70 && payload.status === "draft"
            ? "completed"
            : payload.status;
        const { resume: saved } = await api.updateResume(payload.id, {
          ...payload,
          status,
        });
        setResume(saved);
        resumeRef.current = saved;
        setDirty(false);
        setSaveState("saved");
        if (manual) {
          window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
        }
      } catch (err) {
        setSaveState("failed");
        setError(err instanceof ApiError ? err.message : "Save failed. Your changes are still here.");
      }
    },
    [readOnly],
  );

  useEffect(() => {
    if (!resume || readOnly) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const current = resumeRef.current;
      if (current) void persist(current);
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [resume, dirty, persist, readOnly]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty || saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saveState]);

  function patchResume(updater: (prev: Resume) => Resume) {
    setResume((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setDirty(true);
      return next;
    });
  }

  function updateBasics<K extends keyof Resume["basics"]>(key: K, value: Resume["basics"][K]) {
    patchResume((prev) => ({ ...prev, basics: { ...prev.basics, [key]: value } }));
  }

  function updateExperience(expId: string, patch: Partial<ResumeExperience>) {
    patchResume((prev) => ({
      ...prev,
      experience: prev.experience.map((item) =>
        item.id === expId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateEducation(eduId: string, patch: Partial<ResumeEducation>) {
    patchResume((prev) => ({
      ...prev,
      education: prev.education.map((item) =>
        item.id === eduId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateCert(certId: string, patch: Partial<ResumeCertification>) {
    patchResume((prev) => ({
      ...prev,
      certifications: prev.certifications.map((item) =>
        item.id === certId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateProject(projId: string, patch: Partial<ResumeProjectItem>) {
    patchResume((prev) => ({
      ...prev,
      projects: prev.projects.map((item) =>
        item.id === projId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addSkill() {
    const name = skillDraft.trim();
    if (!name || !resume) return;
    const skill: ResumeSkill = {
      id: newId("skill"),
      name,
      category: skillCategory,
      level: "",
      years: "",
    };
    patchResume((prev) => ({ ...prev, skills: [...(prev.skills || []), skill] }));
    setSkillDraft("");
  }

  async function manualSave() {
    if (!resume) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist(resume, { manual: true });
  }

  if (loading) {
    return <div className="card h-48 animate-pulse bg-ink-100" aria-busy="true" />;
  }

  if (!resume) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-ink-300" />
        <p className="mt-3 text-sm text-ink-500">{error || "Resume not found."}</p>
        <Link to="/admin/resume-builder" className="btn-secondary mt-4 inline-flex">
          Back to resumes
        </Link>
      </div>
    );
  }

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "failed"
          ? "Save failed"
          : dirty
            ? "Unsaved changes"
            : "All changes saved";

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            to="/admin/resume-builder"
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-4 w-4" /> My Resumes
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink-950 sm:text-3xl">
            {resume.title}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {resume.target_role || "No target role"} · {resume.completion_percentage}% complete
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p
            className="text-sm text-ink-500"
            aria-live="polite"
            role="status"
          >
            {saveState === "saving" ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {saveLabel}
              </span>
            ) : saveState === "saved" ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <Check className="h-3.5 w-3.5" /> {saveLabel}
              </span>
            ) : (
              saveLabel
            )}
          </p>
          <EditGuard>
            <button
              type="button"
              className="btn-primary"
              disabled={readOnly || saveState === "saving"}
              onClick={() => void manualSave()}
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </EditGuard>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {resume.parse_status === "failed" && resume.parse_error ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Import note: {resume.parse_error} You can still edit fields manually.
        </div>
      ) : null}

      {/* Mobile section tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              section === item.id
                ? "bg-brand-600 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <nav className="hidden lg:block" aria-label="Resume sections">
          <ul className="space-y-1">
            {SECTIONS.map((item) => {
              const done = sectionComplete(resume, item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                      section === item.id
                        ? "bg-brand-50 font-semibold text-brand-800"
                        : "text-ink-600 hover:bg-ink-50"
                    }`}
                    onClick={() => setSection(item.id)}
                  >
                    <span>{item.label}</span>
                    {done && item.id !== "preview" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="Complete" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 rounded-lg border border-ink-100 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Completion</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">
              {resume.completion_percentage}%
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${resume.completion_percentage}%` }}
              />
            </div>
          </div>
        </nav>

        <div className="card min-w-0 p-5 sm:p-6">
          {section === "meta" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink-900">Resume details</h2>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">Resume name</span>
                <input
                  className="input-field"
                  value={resume.title}
                  disabled={readOnly}
                  onChange={(e) => patchResume((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">Target role</span>
                <input
                  className="input-field"
                  value={resume.target_role || ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    patchResume((prev) => ({ ...prev, target_role: e.target.value }))
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink-700">Industry</span>
                  <input
                    className="input-field"
                    value={resume.target_industry || ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      patchResume((prev) => ({ ...prev, target_industry: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink-700">Country / market</span>
                  <input
                    className="input-field"
                    value={resume.target_country || ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      patchResume((prev) => ({ ...prev, target_country: e.target.value }))
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}

          {section === "basics" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink-900">Basic information</h2>
              <p className="text-sm text-ink-500">
                Only share contact details you are comfortable including on a resume you download or
                share.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["name", "Full name"],
                    ["title", "Professional headline"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                    ["city", "City"],
                    ["country", "Country"],
                    ["linkedin_url", "LinkedIn URL"],
                    ["portfolio_url", "Portfolio URL"],
                    ["website_url", "Personal website"],
                    ["github_url", "GitHub URL"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
                    <input
                      className="input-field"
                      value={(resume.basics[key] as string) || ""}
                      disabled={readOnly}
                      onChange={(e) => updateBasics(key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">
                  Address <span className="text-ink-400">(optional)</span>
                </span>
                <input
                  className="input-field"
                  value={resume.basics.address || ""}
                  disabled={readOnly}
                  onChange={(e) => updateBasics("address", e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {section === "summary" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink-900">Professional summary</h2>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">
                  Summary{" "}
                  <span className="font-normal text-ink-400">
                    ({(resume.basics.summary || "").length} characters · aim for 400–800)
                  </span>
                </span>
                <textarea
                  className="input-field min-h-36"
                  value={resume.basics.summary || ""}
                  disabled={readOnly}
                  onChange={(e) => updateBasics("summary", e.target.value)}
                  placeholder="A concise overview of your experience, strengths, and the roles you target."
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">
                  Career objective{" "}
                  <span className="text-ink-400">(optional alternative for junior profiles)</span>
                </span>
                <textarea
                  className="input-field min-h-24"
                  value={resume.basics.objective || ""}
                  disabled={readOnly}
                  onChange={(e) => updateBasics("objective", e.target.value)}
                />
              </label>
              <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
                AI writing assistance is not currently configured in this editor view. You can still
                write and edit manually.
              </p>
            </div>
          ) : null}

          {section === "experience" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink-900">Work experience</h2>
                <EditGuard>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={readOnly}
                    onClick={() =>
                      patchResume((prev) => ({
                        ...prev,
                        experience: [
                          {
                            id: newId("exp"),
                            company: "",
                            role: "",
                            employment_type: "",
                            location: "",
                            work_mode: "",
                            start: "",
                            end: "",
                            current: false,
                            description: "",
                            bullets: [""],
                            tools: [],
                          },
                          ...prev.experience,
                        ],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> Add role
                  </button>
                </EditGuard>
              </div>
              {resume.experience.length === 0 ? (
                <p className="text-sm text-ink-500">No experience entries yet.</p>
              ) : null}
              {resume.experience.map((item) => (
                <div key={item.id} className="space-y-3 rounded-xl border border-ink-100 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Job title</span>
                      <input
                        className="input-field"
                        value={item.role}
                        disabled={readOnly}
                        onChange={(e) => updateExperience(item.id, { role: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Company</span>
                      <input
                        className="input-field"
                        value={item.company}
                        disabled={readOnly}
                        onChange={(e) => updateExperience(item.id, { company: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Location</span>
                      <input
                        className="input-field"
                        value={item.location}
                        disabled={readOnly}
                        onChange={(e) => updateExperience(item.id, { location: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Work mode</span>
                      <select
                        className="input-field"
                        value={item.work_mode || ""}
                        disabled={readOnly}
                        onChange={(e) => updateExperience(item.id, { work_mode: e.target.value })}
                      >
                        <option value="">Not specified</option>
                        <option value="onsite">Onsite</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="remote">Remote</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Start</span>
                      <input
                        className="input-field"
                        value={item.start}
                        disabled={readOnly}
                        placeholder="Jan 2022"
                        onChange={(e) => updateExperience(item.id, { start: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">End</span>
                      <input
                        className="input-field"
                        value={item.end}
                        disabled={readOnly || item.current}
                        placeholder="Present"
                        onChange={(e) => updateExperience(item.id, { end: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={item.current}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateExperience(item.id, {
                          current: e.target.checked,
                          end: e.target.checked ? "" : item.end,
                        })
                      }
                    />
                    I currently work here
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-500">
                      Achievement bullets (one per line)
                    </span>
                    <textarea
                      className="input-field min-h-28"
                      value={(item.bullets || []).join("\n")}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateExperience(item.id, {
                          bullets: e.target.value.split("\n"),
                        })
                      }
                    />
                  </label>
                  <EditGuard>
                    <button
                      type="button"
                      className="btn-ghost text-sm text-red-700"
                      disabled={readOnly}
                      onClick={() =>
                        patchResume((prev) => ({
                          ...prev,
                          experience: prev.experience.filter((row) => row.id !== item.id),
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </EditGuard>
                </div>
              ))}
            </div>
          ) : null}

          {section === "education" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-900">Education</h2>
                <EditGuard>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={readOnly}
                    onClick={() =>
                      patchResume((prev) => ({
                        ...prev,
                        education: [
                          ...prev.education,
                          {
                            id: newId("edu"),
                            school: "",
                            degree: "",
                            field: "",
                            location: "",
                            start: "",
                            end: "",
                            current: false,
                            grade: "",
                            details: "",
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> Add education
                  </button>
                </EditGuard>
              </div>
              {resume.education.map((item) => (
                <div key={item.id} className="space-y-3 rounded-xl border border-ink-100 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["school", "Institution"],
                        ["degree", "Degree / qualification"],
                        ["field", "Field of study"],
                        ["location", "Location"],
                        ["start", "Start"],
                        ["end", "End"],
                        ["grade", "Grade / GPA"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
                        <input
                          className="input-field"
                          value={(item[key] as string) || ""}
                          disabled={readOnly || (key === "end" && item.current)}
                          onChange={(e) => updateEducation(item.id, { [key]: e.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(item.current)}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateEducation(item.id, {
                          current: e.target.checked,
                          end: e.target.checked ? "" : item.end,
                        })
                      }
                    />
                    Currently studying
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-500">Description</span>
                    <textarea
                      className="input-field min-h-20"
                      value={item.details}
                      disabled={readOnly}
                      onChange={(e) => updateEducation(item.id, { details: e.target.value })}
                    />
                  </label>
                  <EditGuard>
                    <button
                      type="button"
                      className="btn-ghost text-sm text-red-700"
                      disabled={readOnly}
                      onClick={() =>
                        patchResume((prev) => ({
                          ...prev,
                          education: prev.education.filter((row) => row.id !== item.id),
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </EditGuard>
                </div>
              ))}
            </div>
          ) : null}

          {section === "skills" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink-900">Skills</h2>
              <p className="text-sm text-ink-500">
                Group skills by category. Proficiency bars are not shown by default.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="input-field flex-1"
                  placeholder="Add a skill"
                  value={skillDraft}
                  disabled={readOnly}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <select
                  className="input-field sm:w-48"
                  value={skillCategory}
                  disabled={readOnly}
                  onChange={(e) => setSkillCategory(e.target.value)}
                >
                  {SKILL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <EditGuard>
                  <button type="button" className="btn-secondary" disabled={readOnly} onClick={addSkill}>
                    Add
                  </button>
                </EditGuard>
              </div>
              <ul className="space-y-2">
                {(resume.skills || []).map((skill) => (
                  <li
                    key={skill.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-800">{skill.name}</p>
                      <p className="text-xs text-ink-400">{skill.category}</p>
                    </div>
                    <EditGuard>
                      <button
                        type="button"
                        className="btn-ghost px-2 text-red-700"
                        aria-label={`Remove ${skill.name}`}
                        disabled={readOnly}
                        onClick={() =>
                          patchResume((prev) => ({
                            ...prev,
                            skills: prev.skills.filter((s) => s.id !== skill.id),
                          }))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </EditGuard>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section === "projects" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-900">Projects</h2>
                <EditGuard>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={readOnly}
                    onClick={() =>
                      patchResume((prev) => ({
                        ...prev,
                        projects: [
                          ...prev.projects,
                          {
                            id: newId("proj"),
                            name: "",
                            role: "",
                            organization: "",
                            url: "",
                            start: "",
                            end: "",
                            summary: "",
                            outcomes: [],
                            tools: [],
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> Add project
                  </button>
                </EditGuard>
              </div>
              {resume.projects.map((item) => (
                <div key={item.id} className="space-y-3 rounded-xl border border-ink-100 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Project name</span>
                      <input
                        className="input-field"
                        value={item.name}
                        disabled={readOnly}
                        onChange={(e) => updateProject(item.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Role</span>
                      <input
                        className="input-field"
                        value={item.role || ""}
                        disabled={readOnly}
                        onChange={(e) => updateProject(item.id, { role: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">URL</span>
                      <input
                        className="input-field"
                        value={item.url}
                        disabled={readOnly}
                        onChange={(e) => updateProject(item.id, { url: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-500">Description</span>
                    <textarea
                      className="input-field min-h-20"
                      value={item.summary}
                      disabled={readOnly}
                      onChange={(e) => updateProject(item.id, { summary: e.target.value })}
                    />
                  </label>
                  <EditGuard>
                    <button
                      type="button"
                      className="btn-ghost text-sm text-red-700"
                      disabled={readOnly}
                      onClick={() =>
                        patchResume((prev) => ({
                          ...prev,
                          projects: prev.projects.filter((row) => row.id !== item.id),
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </EditGuard>
                </div>
              ))}
            </div>
          ) : null}

          {section === "certifications" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-900">Certifications</h2>
                <EditGuard>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={readOnly}
                    onClick={() =>
                      patchResume((prev) => ({
                        ...prev,
                        certifications: [
                          ...prev.certifications,
                          {
                            id: newId("cert"),
                            name: "",
                            issuer: "",
                            year: "",
                            issue_date: "",
                            expiration_date: "",
                            credential_id: "",
                            credential_url: "",
                            no_expiry: false,
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> Add certification
                  </button>
                </EditGuard>
              </div>
              {resume.certifications.map((item) => (
                <div key={item.id} className="space-y-3 rounded-xl border border-ink-100 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["name", "Certification name"],
                        ["issuer", "Issuing organisation"],
                        ["year", "Issue year / date"],
                        ["credential_url", "Credential URL"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
                        <input
                          className="input-field"
                          value={(item[key] as string) || ""}
                          disabled={readOnly}
                          onChange={(e) => updateCert(item.id, { [key]: e.target.value })}
                        />
                      </label>
                    ))}
                  </div>
                  <EditGuard>
                    <button
                      type="button"
                      className="btn-ghost text-sm text-red-700"
                      disabled={readOnly}
                      onClick={() =>
                        patchResume((prev) => ({
                          ...prev,
                          certifications: prev.certifications.filter((row) => row.id !== item.id),
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </EditGuard>
                </div>
              ))}
            </div>
          ) : null}

          {section === "languages" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-900">Languages</h2>
                <EditGuard>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={readOnly}
                    onClick={() =>
                      patchResume((prev) => ({
                        ...prev,
                        languages: [
                          ...(prev.languages || []),
                          { id: newId("lang"), language: "", proficiency: "Professional working proficiency" },
                        ],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> Add language
                  </button>
                </EditGuard>
              </div>
              {(resume.languages || []).map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-ink-100 p-4 sm:flex-row">
                  <label className="block flex-1">
                    <span className="mb-1 block text-xs font-medium text-ink-500">Language</span>
                    <input
                      className="input-field"
                      value={item.language}
                      disabled={readOnly}
                      onChange={(e) =>
                        patchResume((prev) => ({
                          ...prev,
                          languages: (prev.languages || []).map((row) =>
                            row.id === item.id ? { ...row, language: e.target.value } : row,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label className="block flex-1">
                    <span className="mb-1 block text-xs font-medium text-ink-500">Proficiency</span>
                    <select
                      className="input-field"
                      value={item.proficiency}
                      disabled={readOnly}
                      onChange={(e) =>
                        patchResume((prev) => ({
                          ...prev,
                          languages: (prev.languages || []).map((row) =>
                            row.id === item.id ? { ...row, proficiency: e.target.value } : row,
                          ),
                        }))
                      }
                    >
                      <option>Native</option>
                      <option>Fluent</option>
                      <option>Professional working proficiency</option>
                      <option>Intermediate</option>
                      <option>Beginner</option>
                    </select>
                  </label>
                  <EditGuard>
                    <button
                      type="button"
                      className="btn-ghost self-end text-red-700"
                      disabled={readOnly}
                      onClick={() =>
                        patchResume((prev) => ({
                          ...prev,
                          languages: (prev.languages || []).filter((row) => row.id !== item.id),
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </EditGuard>
                </div>
              ))}
            </div>
          ) : null}

          {section === "preview" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-ink-900">Preview</h2>
              <p className="text-sm text-ink-500">
                Live template preview and PDF export arrive in Phase 3. Here is a structured content
                preview of what you have so far.
              </p>
              <ResumeContentPreview resume={resume} />
            </div>
          ) : null}
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-6 card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Live preview</p>
            <div className="mt-3 max-h-[70vh] overflow-y-auto text-sm">
              <ResumeContentPreview resume={resume} compact />
            </div>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex gap-2">
          <EditGuard>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={readOnly || saveState === "saving"}
              onClick={() => void manualSave()}
            >
              <Save className="h-4 w-4" /> Save
            </button>
          </EditGuard>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSection("preview")}
          >
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}

function ResumeContentPreview({
  resume,
  compact = false,
}: {
  resume: Resume;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-5 rounded-xl border border-ink-100 bg-white p-5"}>
      <div>
        <p className={`font-semibold text-ink-950 ${compact ? "text-base" : "text-xl"}`}>
          {resume.basics.name || "Your name"}
        </p>
        <p className="text-sm text-ink-600">{resume.basics.title || resume.target_role}</p>
        <p className="mt-1 text-xs text-ink-400">
          {[resume.basics.email, resume.basics.phone, resume.basics.city || resume.basics.location]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {(resume.basics.summary || resume.basics.objective) && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Summary</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
            {resume.basics.summary || resume.basics.objective}
          </p>
        </section>
      )}
      {resume.experience.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Experience</h3>
          <ul className="mt-2 space-y-3">
            {resume.experience.map((item) => (
              <li key={item.id}>
                <p className="text-sm font-medium text-ink-800">
                  {item.role || "Role"} · {item.company || "Company"}
                </p>
                <p className="text-xs text-ink-400">
                  {item.start}
                  {item.start || item.end || item.current ? " – " : ""}
                  {item.current ? "Present" : item.end}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-ink-600">
                  {(item.bullets || []).filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(resume.skills || []).length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Skills</h3>
          <p className="mt-1 text-sm text-ink-700">
            {(resume.skills || []).map((s) => s.name).join(" · ")}
          </p>
        </section>
      )}
    </div>
  );
}
