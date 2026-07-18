import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  ExternalLink,
} from "lucide-react";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { canEditPlatform } from "../../lib/roles";
import type {
  Resume,
  ResumeCertification,
  ResumeEducation,
  ResumeExperience,
  ResumeProjectItem,
} from "../../types";

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ResumeBuilderPage() {
  const { user, refreshUser } = useAuth();
  const readOnly = !canEditPlatform(user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [resume, setResume] = useState<Resume | null>(null);
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getMyResume()
      .then((res) => {
        if (cancelled) return;
        setResume(res.resume);
        setSkillsText((res.resume?.skills || []).join(", "));
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
  }, []);

  async function createBlank() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { resume: next } = await api.createBlankResume();
      setResume(next);
      setSkillsText((next.skills || []).join(", "));
      setNotice("Blank resume created. Add your details and save.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create resume.");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!resume) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const skills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const { resume: next } = await api.saveMyResume({ ...resume, skills });
      setResume(next);
      setSkillsText((next.skills || []).join(", "));
      setNotice("Resume saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save resume.");
    } finally {
      setSaving(false);
    }
  }

  async function onImportFile(file: File | null) {
    if (!file) return;
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const result = await api.importResume(file);
      setResume(result.resume);
      setSkillsText((result.resume.skills || []).join(", "));
      setNotice(
        result.message ||
          (result.ai_used
            ? `Imported and filled (${result.credits_used || 0} AI credits).`
            : "File imported."),
      );
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not import resume.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function updateBasics<K extends keyof Resume["basics"]>(key: K, value: Resume["basics"][K]) {
    setResume((prev) => (prev ? { ...prev, basics: { ...prev.basics, [key]: value } } : prev));
  }

  function updateExperience(id: string, patch: Partial<ResumeExperience>) {
    setResume((prev) =>
      prev
        ? {
            ...prev,
            experience: prev.experience.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : prev,
    );
  }

  function updateEducation(id: string, patch: Partial<ResumeEducation>) {
    setResume((prev) =>
      prev
        ? {
            ...prev,
            education: prev.education.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : prev,
    );
  }

  function updateCert(id: string, patch: Partial<ResumeCertification>) {
    setResume((prev) =>
      prev
        ? {
            ...prev,
            certifications: prev.certifications.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : prev,
    );
  }

  function updateProject(id: string, patch: Partial<ResumeProjectItem>) {
    setResume((prev) =>
      prev
        ? {
            ...prev,
            projects: prev.projects.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          }
        : prev,
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading resume…
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Career</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-950">Resume Builder</h1>
          <p className="mt-2 text-ink-600">
            Create a structured resume from scratch, or upload a PDF/DOCX to fill the details
            automatically.
          </p>
        </div>
        {readOnly ? <ReadOnlyNotice /> : null}
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}
        <EditGuard>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void createBlank()}
              disabled={saving || importing}
              className="card flex flex-col items-start gap-3 p-6 text-left transition hover:border-brand-300"
            >
              <Plus className="h-6 w-6 text-brand-600" />
              <span className="font-display text-xl font-bold text-ink-950">Create blank resume</span>
              <span className="text-sm text-ink-500">Start with an empty structured form.</span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={saving || importing}
              className="card flex flex-col items-start gap-3 p-6 text-left transition hover:border-brand-300"
            >
              {importing ? (
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              ) : (
                <Upload className="h-6 w-6 text-brand-600" />
              )}
              <span className="font-display text-xl font-bold text-ink-950">Upload PDF or DOCX</span>
              <span className="text-sm text-ink-500">
                Import and auto-fill fields (uses 3 AI credits when AI is configured).
              </span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => void onImportFile(e.target.files?.[0] || null)}
          />
        </EditGuard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Career</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-950">Resume Builder</h1>
          <p className="mt-2 text-sm text-ink-500">
            Status: {resume.parse_status}
            {resume.source_filename ? ` · Source: ${resume.source_filename}` : ""}
          </p>
        </div>
        <EditGuard>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing || saving || readOnly}
              className="btn-secondary"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Re-import
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || importing || readOnly}
              className="btn-primary"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => void onImportFile(e.target.files?.[0] || null)}
          />
        </EditGuard>
      </div>

      {readOnly ? <ReadOnlyNotice /> : null}
      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {notice}
        </div>
      ) : null}
      {resume.parse_error && resume.parse_status === "failed" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Parse note: {resume.parse_error}
        </div>
      ) : null}

      {user?.cv_url ? (
        <a
          href={resolveAssetUrl(user.cv_url)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-500"
        >
          <FileText className="h-4 w-4" />
          Open source CV file
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-bold text-ink-950">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Resume title</span>
            <input
              className="input-field"
              value={resume.title}
              disabled={readOnly}
              onChange={(e) => setResume({ ...resume, title: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Full name</span>
            <input
              className="input-field"
              value={resume.basics.name}
              disabled={readOnly}
              onChange={(e) => updateBasics("name", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Professional title</span>
            <input
              className="input-field"
              value={resume.basics.title}
              disabled={readOnly}
              onChange={(e) => updateBasics("title", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Email</span>
            <input
              className="input-field"
              value={resume.basics.email}
              disabled={readOnly}
              onChange={(e) => updateBasics("email", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Phone</span>
            <input
              className="input-field"
              value={resume.basics.phone}
              disabled={readOnly}
              onChange={(e) => updateBasics("phone", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Location</span>
            <input
              className="input-field"
              value={resume.basics.location}
              disabled={readOnly}
              onChange={(e) => updateBasics("location", e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink-700">Summary</span>
          <textarea
            className="input-field min-h-[110px]"
            value={resume.basics.summary}
            disabled={readOnly}
            onChange={(e) => updateBasics("summary", e.target.value)}
          />
        </label>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink-950">Experience</h2>
          <EditGuard>
            <button
              type="button"
              className="btn-secondary py-2 text-sm"
              disabled={readOnly}
              onClick={() =>
                setResume({
                  ...resume,
                  experience: [
                    ...resume.experience,
                    {
                      id: newId("exp"),
                      company: "",
                      role: "",
                      location: "",
                      start: "",
                      end: "",
                      current: false,
                      bullets: [""],
                    },
                  ],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </EditGuard>
        </div>
        {resume.experience.length === 0 ? (
          <p className="text-sm text-ink-500">No experience entries yet.</p>
        ) : (
          resume.experience.map((item) => (
            <div key={item.id} className="space-y-3 rounded-xl border border-ink-100 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="input-field"
                  placeholder="Company"
                  value={item.company}
                  disabled={readOnly}
                  onChange={(e) => updateExperience(item.id, { company: e.target.value })}
                />
                <input
                  className="input-field"
                  placeholder="Role"
                  value={item.role}
                  disabled={readOnly}
                  onChange={(e) => updateExperience(item.id, { role: e.target.value })}
                />
                <input
                  className="input-field"
                  placeholder="Location"
                  value={item.location}
                  disabled={readOnly}
                  onChange={(e) => updateExperience(item.id, { location: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input-field"
                    placeholder="Start"
                    value={item.start}
                    disabled={readOnly}
                    onChange={(e) => updateExperience(item.id, { start: e.target.value })}
                  />
                  <input
                    className="input-field"
                    placeholder="End"
                    value={item.end}
                    disabled={readOnly || item.current}
                    onChange={(e) => updateExperience(item.id, { end: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-600">
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
                Current role
              </label>
              <textarea
                className="input-field min-h-[90px]"
                placeholder="Bullets (one per line)"
                value={(item.bullets || []).join("\n")}
                disabled={readOnly}
                onChange={(e) =>
                  updateExperience(item.id, {
                    bullets: e.target.value.split("\n"),
                  })
                }
              />
              <EditGuard>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-500"
                  disabled={readOnly}
                  onClick={() =>
                    setResume({
                      ...resume,
                      experience: resume.experience.filter((row) => row.id !== item.id),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </EditGuard>
            </div>
          ))
        )}
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink-950">Education</h2>
          <EditGuard>
            <button
              type="button"
              className="btn-secondary py-2 text-sm"
              disabled={readOnly}
              onClick={() =>
                setResume({
                  ...resume,
                  education: [
                    ...resume.education,
                    {
                      id: newId("edu"),
                      school: "",
                      degree: "",
                      field: "",
                      start: "",
                      end: "",
                      details: "",
                    },
                  ],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </EditGuard>
        </div>
        {resume.education.map((item) => (
          <div key={item.id} className="space-y-3 rounded-xl border border-ink-100 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="input-field"
                placeholder="School"
                value={item.school}
                disabled={readOnly}
                onChange={(e) => updateEducation(item.id, { school: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Degree"
                value={item.degree}
                disabled={readOnly}
                onChange={(e) => updateEducation(item.id, { degree: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Field"
                value={item.field}
                disabled={readOnly}
                onChange={(e) => updateEducation(item.id, { field: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input-field"
                  placeholder="Start"
                  value={item.start}
                  disabled={readOnly}
                  onChange={(e) => updateEducation(item.id, { start: e.target.value })}
                />
                <input
                  className="input-field"
                  placeholder="End"
                  value={item.end}
                  disabled={readOnly}
                  onChange={(e) => updateEducation(item.id, { end: e.target.value })}
                />
              </div>
            </div>
            <textarea
              className="input-field"
              placeholder="Details"
              value={item.details}
              disabled={readOnly}
              onChange={(e) => updateEducation(item.id, { details: e.target.value })}
            />
            <EditGuard>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-rose-600"
                disabled={readOnly}
                onClick={() =>
                  setResume({
                    ...resume,
                    education: resume.education.filter((row) => row.id !== item.id),
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </EditGuard>
          </div>
        ))}
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl font-bold text-ink-950">Skills</h2>
        <textarea
          className="input-field min-h-[80px]"
          placeholder="Comma-separated skills"
          value={skillsText}
          disabled={readOnly}
          onChange={(e) => setSkillsText(e.target.value)}
        />
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink-950">Certifications</h2>
          <EditGuard>
            <button
              type="button"
              className="btn-secondary py-2 text-sm"
              disabled={readOnly}
              onClick={() =>
                setResume({
                  ...resume,
                  certifications: [
                    ...resume.certifications,
                    { id: newId("cert"), name: "", issuer: "", year: "" },
                  ],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </EditGuard>
        </div>
        {resume.certifications.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-xl border border-ink-100 p-4 sm:grid-cols-3">
            <input
              className="input-field"
              placeholder="Name"
              value={item.name}
              disabled={readOnly}
              onChange={(e) => updateCert(item.id, { name: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Issuer"
              value={item.issuer}
              disabled={readOnly}
              onChange={(e) => updateCert(item.id, { issuer: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                className="input-field"
                placeholder="Year"
                value={item.year}
                disabled={readOnly}
                onChange={(e) => updateCert(item.id, { year: e.target.value })}
              />
              <EditGuard>
                <button
                  type="button"
                  className="btn-secondary px-3"
                  disabled={readOnly}
                  onClick={() =>
                    setResume({
                      ...resume,
                      certifications: resume.certifications.filter((row) => row.id !== item.id),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </EditGuard>
            </div>
          </div>
        ))}
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink-950">Projects</h2>
          <EditGuard>
            <button
              type="button"
              className="btn-secondary py-2 text-sm"
              disabled={readOnly}
              onClick={() =>
                setResume({
                  ...resume,
                  projects: [
                    ...resume.projects,
                    { id: newId("proj"), name: "", url: "", summary: "" },
                  ],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </EditGuard>
        </div>
        {resume.projects.map((item) => (
          <div key={item.id} className="space-y-3 rounded-xl border border-ink-100 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="input-field"
                placeholder="Project name"
                value={item.name}
                disabled={readOnly}
                onChange={(e) => updateProject(item.id, { name: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="URL"
                value={item.url}
                disabled={readOnly}
                onChange={(e) => updateProject(item.id, { url: e.target.value })}
              />
            </div>
            <textarea
              className="input-field"
              placeholder="Summary"
              value={item.summary}
              disabled={readOnly}
              onChange={(e) => updateProject(item.id, { summary: e.target.value })}
            />
            <EditGuard>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-rose-600"
                disabled={readOnly}
                onClick={() =>
                  setResume({
                    ...resume,
                    projects: resume.projects.filter((row) => row.id !== item.id),
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </EditGuard>
          </div>
        ))}
      </section>

      <EditGuard>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || importing || readOnly}
            className="btn-primary"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save resume
          </button>
        </div>
      </EditGuard>
    </div>
  );
}
