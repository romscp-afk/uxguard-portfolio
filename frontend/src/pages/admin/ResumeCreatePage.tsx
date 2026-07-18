import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileUp, Loader2, PenLine, Upload } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { canEditPlatform } from "../../lib/roles";
import type { Resume, ResumeExperienceLevel } from "../../types";

const EXPERIENCE_OPTIONS: { value: ResumeExperienceLevel; label: string }[] = [
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "executive", label: "Executive" },
  { value: "career_change", label: "Career Change" },
];

const ACCEPTED = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 10 * 1024 * 1024;

export function ResumeCreatePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const readOnly = !canEditPlatform(user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [method, setMethod] = useState<"choose" | "manual" | "upload">("choose");
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ResumeExperienceLevel>("mid");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const defaultTitle = useMemo(() => {
    const name = user?.name?.trim() || "My";
    const role = targetRole.trim();
    return role ? `${name} – ${role}` : `${name} Resume`;
  }, [user?.name, targetRole]);

  function validateMeta() {
    const resumeName = (title.trim() || defaultTitle).trim();
    if (!resumeName) {
      setError("Resume name is required.");
      return null;
    }
    return {
      title: resumeName,
      target_role: targetRole.trim(),
      target_industry: targetIndustry.trim(),
      target_country: targetCountry.trim(),
      experience_level: experienceLevel,
    };
  }

  async function startManual() {
    const meta = validateMeta();
    if (!meta) return;
    setBusy(true);
    setError("");
    try {
      const { resume } = await api.createResume({
        ...meta,
        creation_method: "manual",
        basics: {
          name: user?.name || "",
          title: meta.target_role,
          email: user?.email || user?.contact_email || "",
          phone: "",
          location: user?.location || "",
          summary: "",
          links: [],
        } as Resume["basics"],
      });
      navigate(`/admin/resume-builder/${resume.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create resume.");
    } finally {
      setBusy(false);
    }
  }

  function onFileChosen(next: File | null) {
    setError("");
    setNotice("");
    if (!next) {
      setFile(null);
      return;
    }
    const lower = next.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      setError("Only PDF or DOCX files are supported.");
      setFile(null);
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("File must be 10 MB or smaller.");
      setFile(null);
      return;
    }
    setFile(next);
  }

  async function startUpload() {
    const meta = validateMeta();
    if (!meta) return;
    if (!file) {
      setError("Choose a PDF or DOCX file to upload.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("Uploading and reading your resume…");
    try {
      const result = await api.importResume(file, meta);
      await refreshUser();
      if (result.message) setNotice(result.message);
      navigate(`/admin/resume-builder/${result.resume.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not import resume.");
      setNotice("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-6">
        <Link
          to="/admin/resume-builder"
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to resumes
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-950">Create New Resume</h1>
        <p className="mt-1 text-ink-500">Choose how you want to start, then add basic details.</p>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {notice}
        </div>
      ) : null}

      {method === "choose" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setMethod("manual")}
            className="card p-8 text-left transition hover:border-brand-300 hover:shadow-md disabled:opacity-60"
          >
            <PenLine className="h-8 w-8 text-brand-600" />
            <h2 className="mt-4 text-xl font-semibold text-ink-900">Start Manually</h2>
            <p className="mt-2 text-sm text-ink-500">
              Build your resume step by step using a guided editor.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-brand-700">
              Start Building →
            </span>
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setMethod("upload")}
            className="card p-8 text-left transition hover:border-brand-300 hover:shadow-md disabled:opacity-60"
          >
            <FileUp className="h-8 w-8 text-brand-600" />
            <h2 className="mt-4 text-xl font-semibold text-ink-900">Upload Existing Resume</h2>
            <p className="mt-2 text-sm text-ink-500">
              Upload a PDF or DOCX file and automatically import its content.
            </p>
            <span className="mt-6 inline-flex text-sm font-semibold text-brand-700">
              Upload Resume →
            </span>
          </button>
        </div>
      ) : (
        <EditGuard>
          <div className="card max-w-2xl space-y-5 p-6">
            <button
              type="button"
              className="text-sm text-ink-500 hover:text-ink-800"
              onClick={() => {
                setMethod("choose");
                setFile(null);
              }}
            >
              ← Change method
            </button>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Resume name</span>
              <input
                className="input-field"
                value={title}
                placeholder={defaultTitle}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Target job title</span>
              <input
                className="input-field"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Product Designer"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">
                  Target industry <span className="text-ink-400">(optional)</span>
                </span>
                <input
                  className="input-field"
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">
                  Country / job market <span className="text-ink-400">(optional)</span>
                </span>
                <input
                  className="input-field"
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Experience level</span>
              <select
                className="input-field"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ResumeExperienceLevel)}
              >
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {method === "upload" ? (
              <div>
                <p className="mb-2 text-sm text-ink-600">
                  Your resume may contain personal information. It will only be processed to create
                  and manage your resume.
                </p>
                <div
                  className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-6 py-10 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0] || null;
                    onFileChosen(dropped);
                  }}
                >
                  <Upload className="mx-auto h-8 w-8 text-ink-400" />
                  <p className="mt-3 text-sm text-ink-600">
                    {file ? file.name : "Drag and drop a PDF or DOCX, or browse files"}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">Max 10 MB · PDF or DOCX</p>
                  <button
                    type="button"
                    className="btn-secondary mt-4"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                  >
                    Browse files
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPTED}
                    className="hidden"
                    onChange={(e) => onFileChosen(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                className="btn-primary"
                disabled={busy || readOnly}
                onClick={() => void (method === "manual" ? startManual() : startUpload())}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {method === "manual" ? "Start Building" : "Upload & Continue"}
              </button>
              <Link to="/admin/resume-builder" className="btn-secondary">
                Cancel
              </Link>
            </div>
          </div>
        </EditGuard>
      )}
    </div>
  );
}
