import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { canEditPlatform } from "../../lib/roles";
import type { Resume, ResumeExtractionField, ResumeSkill } from "../../types";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  needs_review: "bg-amber-50 text-amber-900 border-amber-200",
  missing: "bg-red-50 text-red-800 border-red-200",
  not_imported: "bg-ink-50 text-ink-600 border-ink-200",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  needs_review: "Needs Review",
  missing: "Missing",
  not_imported: "Not Imported",
};

function fieldStatus(fields: Record<string, ResumeExtractionField> | undefined, key: string) {
  return fields?.[key]?.status || "not_imported";
}

function confidenceLabel(fields: Record<string, ResumeExtractionField> | undefined, key: string) {
  const c = fields?.[key]?.confidence;
  if (c == null) return null;
  return `${Math.round(c * 100)}%`;
}

export function ResumeReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const readOnly = !canEditPlatform(user);
  const resumeId = Number(id);

  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [skillsText, setSkillsText] = useState("");

  useEffect(() => {
    if (!Number.isFinite(resumeId) || resumeId <= 0) {
      navigate("/admin/resume-builder", { replace: true });
      return;
    }
    let cancelled = false;
    api
      .getResume(resumeId)
      .then((data) => {
        if (cancelled) return;
        setResume(data.resume);
        setSkillsText((data.resume.skills || []).map((s) => s.name).join(", "));
        if (
          data.resume.extraction?.status === "confirmed" ||
          data.resume.extraction?.status === "skipped"
        ) {
          navigate(`/admin/resume-builder/${resumeId}`, { replace: true });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load extraction.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resumeId, navigate]);

  const fields = resume?.extraction?.fields || {};
  const warnings = resume?.extraction?.warnings || [];

  const reviewStats = useMemo(() => {
    const values = Object.values(fields);
    return {
      needsReview: values.filter((f) => f.status === "needs_review" || f.status === "missing")
        .length,
      confirmed: values.filter((f) => f.status === "confirmed").length,
    };
  }, [fields]);

  function updateBasics<K extends keyof Resume["basics"]>(key: K, value: Resume["basics"][K]) {
    setResume((prev) =>
      prev
        ? {
            ...prev,
            basics: { ...prev.basics, [key]: value },
            extraction: prev.extraction
              ? {
                  ...prev.extraction,
                  fields: {
                    ...prev.extraction.fields,
                    [`basics.${String(key)}`]: {
                      ...(prev.extraction.fields[`basics.${String(key)}`] || {
                        confidence: 1,
                        status: "confirmed",
                        value: "",
                      }),
                      value: typeof value === "string" ? value : String(value ?? ""),
                      status: "confirmed",
                      reviewed: true,
                      changed: true,
                    },
                  },
                }
              : prev.extraction,
          }
        : prev,
    );
  }

  function acceptHighConfidence() {
    setResume((prev) => {
      if (!prev?.extraction) return prev;
      const nextFields = { ...prev.extraction.fields };
      Object.keys(nextFields).forEach((key) => {
        const field = nextFields[key];
        if (field.confidence >= 0.8 && field.status !== "missing") {
          nextFields[key] = { ...field, status: "confirmed", reviewed: true };
        }
      });
      return {
        ...prev,
        extraction: { ...prev.extraction, fields: nextFields },
      };
    });
  }

  async function confirmAndContinue() {
    if (!resume) return;
    setBusy(true);
    setError("");
    try {
      const skills: ResumeSkill[] = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({
          id: `skill_${Math.random().toString(36).slice(2, 8)}`,
          name,
          category: "Other",
        }));
      const { resume: saved } = await api.confirmResumeExtraction(resume.id, {
        resume: { ...resume, skills },
        extraction: resume.extraction || undefined,
      });
      navigate(`/admin/resume-builder/${saved.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not confirm extraction.");
    } finally {
      setBusy(false);
    }
  }

  async function skipReview() {
    if (!resume) return;
    if (
      !window.confirm(
        "Skip review and continue with the extracted data as-is? You can still edit everything later.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { resume: saved } = await api.confirmResumeExtraction(resume.id, { action: "skip" });
      navigate(`/admin/resume-builder/${saved.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not skip review.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="card h-48 animate-pulse bg-ink-100" aria-busy="true" />;
  }

  if (!resume) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-ink-500">{error || "Resume not found."}</p>
        <Link to="/admin/resume-builder" className="btn-secondary mt-4 inline-flex">
          Back to resumes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-6">
        <Link
          to="/admin/resume-builder"
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> My Resumes
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-950">Review imported resume</h1>
        <p className="mt-2 max-w-3xl text-ink-600">
          Please review the imported information. Some formatting or details may require correction.
          Extraction is not 100% accurate.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mb-4 space-y-2">
          {warnings.map((w, i) => (
            <div
              key={`${w.code || "w"}-${i}`}
              className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
          {reviewStats.needsReview} need review
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          {reviewStats.confirmed} high confidence
        </span>
        <EditGuard>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={readOnly || busy}
            onClick={acceptHighConfidence}
          >
            <CheckCircle2 className="h-4 w-4" />
            Accept all high-confidence fields
          </button>
        </EditGuard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink-900">Extracted fields</h2>

          {(
            [
              ["name", "Full name", true],
              ["title", "Professional headline", false],
              ["email", "Email", true],
              ["phone", "Phone", false],
              ["location", "Location", false],
              ["linkedin_url", "LinkedIn", false],
            ] as const
          ).map(([key, label, required]) => {
            const statusKey = `basics.${key}`;
            const status = fieldStatus(fields, statusKey);
            return (
              <label key={key} className="block">
                <span className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-medium text-ink-700">
                  {label}
                  {required ? <span className="text-red-600">*</span> : null}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
                  >
                    {STATUS_LABELS[status]}
                    {confidenceLabel(fields, statusKey)
                      ? ` · ${confidenceLabel(fields, statusKey)}`
                      : ""}
                  </span>
                </span>
                <input
                  className="input-field"
                  value={(resume.basics[key] as string) || ""}
                  disabled={readOnly}
                  onChange={(e) => updateBasics(key, e.target.value)}
                />
              </label>
            );
          })}

          <label className="block">
            <span className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-medium text-ink-700">
              Professional summary
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[fieldStatus(fields, "basics.summary")]}`}
              >
                {STATUS_LABELS[fieldStatus(fields, "basics.summary")]}
              </span>
            </span>
            <textarea
              className="input-field min-h-32"
              value={resume.basics.summary || ""}
              disabled={readOnly}
              onChange={(e) => updateBasics("summary", e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-medium text-ink-700">
              Skills (comma separated)
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[fieldStatus(fields, "skills")]}`}
              >
                {STATUS_LABELS[fieldStatus(fields, "skills")]}
              </span>
            </span>
            <textarea
              className="input-field min-h-20"
              value={skillsText}
              disabled={readOnly}
              onChange={(e) => setSkillsText(e.target.value)}
            />
          </label>

          <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-4 text-sm text-ink-600">
            <p className="font-medium text-ink-800">Also imported</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Work experience: {resume.experience.length} entr
                {resume.experience.length === 1 ? "y" : "ies"}{" "}
                <span className="text-ink-400">(editable in the builder)</span>
              </li>
              <li>Education: {resume.education.length}</li>
              <li>Projects: {resume.projects.length}</li>
              <li>Certifications: {resume.certifications.length}</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <EditGuard>
              <button
                type="button"
                className="btn-primary"
                disabled={readOnly || busy}
                onClick={() => void confirmAndContinue()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue to Resume Builder
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={readOnly || busy}
                onClick={() => void skipReview()}
              >
                Skip unresolved content
              </button>
            </EditGuard>
            <Link to="/admin/resume-builder/new" className="btn-ghost text-sm">
              Restart upload
            </Link>
          </div>
        </div>

        <div className="card flex max-h-[80vh] flex-col p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink-900">Source text</h2>
          <p className="mt-1 text-sm text-ink-500">
            Extracted from {resume.source_filename || "uploaded file"}. Compare this with the fields
            on the left.
          </p>
          <pre className="mt-4 flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-ink-100 bg-ink-50 p-4 text-xs leading-relaxed text-ink-700">
            {resume.extraction?.raw_text ||
              "No source text available. You can still edit fields manually in the builder."}
          </pre>
        </div>
      </div>
    </div>
  );
}
