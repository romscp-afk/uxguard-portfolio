import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, Sparkles } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard } from "../platform/ReadOnlyNotice";
import type {
  Resume,
  ResumeMatchResult,
  ResumeQualityResult,
  ResumeSettings,
  ResumeTemplateInfo,
  ResumeVersionSummary,
} from "../../types";

export function DesignPanel({
  resume,
  readOnly,
  onChange,
}: {
  resume: Resume;
  readOnly: boolean;
  onChange: (patch: Partial<Resume>) => void;
}) {
  const [templates, setTemplates] = useState<ResumeTemplateInfo[]>([]);

  useEffect(() => {
    api
      .getResumeTemplates()
      .then((data) => setTemplates(data.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  const settings = resume.settings || ({} as ResumeSettings);

  function updateSettings(patch: Partial<ResumeSettings>) {
    onChange({ settings: { ...settings, ...patch } as ResumeSettings });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-ink-900">Design & template</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            disabled={readOnly}
            onClick={() =>
              onChange({
                template_id: tpl.id,
                settings: { ...tpl.defaults, ...settings, ...tpl.defaults },
              })
            }
            className={`rounded-xl border p-4 text-left transition ${
              resume.template_id === tpl.id
                ? "border-brand-400 bg-brand-50"
                : "border-ink-100 hover:border-brand-200"
            }`}
          >
            <p className="font-semibold text-ink-900">{tpl.name}</p>
            <p className="mt-1 text-xs text-ink-500">{tpl.description}</p>
            {tpl.ats_friendly ? (
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                ATS-friendly
              </p>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Primary colour</span>
          <input
            type="color"
            className="h-10 w-full cursor-pointer rounded border border-ink-200"
            value={settings.primary_color || "#111827"}
            disabled={readOnly}
            onChange={(e) => updateSettings({ primary_color: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Accent colour</span>
          <input
            type="color"
            className="h-10 w-full cursor-pointer rounded border border-ink-200"
            value={settings.accent_color || "#111827"}
            disabled={readOnly}
            onChange={(e) => updateSettings({ accent_color: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Font</span>
          <select
            className="input-field"
            value={settings.font_family || "Helvetica"}
            disabled={readOnly}
            onChange={(e) => updateSettings({ font_family: e.target.value })}
          >
            <option value="Helvetica">Helvetica</option>
            <option value="Times-Roman">Times</option>
            <option value="Courier">Courier</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Page size</span>
          <select
            className="input-field"
            value={settings.page_size || "a4"}
            disabled={readOnly}
            onChange={(e) =>
              updateSettings({ page_size: e.target.value === "letter" ? "letter" : "a4" })
            }
          >
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">
            Font size ({settings.font_size || 11}pt)
          </span>
          <input
            type="range"
            min={9}
            max={14}
            step={0.5}
            value={settings.font_size || 11}
            disabled={readOnly}
            onChange={(e) => updateSettings({ font_size: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={Boolean(settings.show_photo)}
            disabled={readOnly}
            onChange={(e) => updateSettings({ show_photo: e.target.checked })}
          />
          Show profile photograph
        </label>
      </div>
    </div>
  );
}

export function QualityPanel({
  resume,
  readOnly,
  onJump,
}: {
  resume: Resume;
  readOnly: boolean;
  onJump: (section: string) => void;
}) {
  const [result, setResult] = useState<ResumeQualityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const data = await api.runResumeQualityCheck(resume.id, resume);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Quality check failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink-900">Resume quality check</h2>
        <EditGuard>
          <button type="button" className="btn-secondary text-sm" disabled={readOnly || busy} onClick={() => void run()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Re-run check
          </button>
        </EditGuard>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {result ? (
        <>
          <p className="text-sm text-ink-500">{result.guidance}</p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-800">
              {result.summary.critical} critical
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900">
              {result.summary.recommended} recommended
            </span>
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-ink-700">
              {result.summary.optional} optional
            </span>
          </div>
          <ul className="space-y-2">
            {result.issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-ink-100 px-3 py-2 text-left text-sm hover:bg-ink-50"
                  onClick={() => issue.section && onJump(issue.section)}
                >
                  <span
                    className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      issue.severity === "critical"
                        ? "bg-red-100 text-red-800"
                        : issue.severity === "recommended"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {issue.severity}
                  </span>
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function VersionsPanel({
  resume,
  readOnly,
  onRestored,
}: {
  resume: Resume;
  readOnly: boolean;
  onRestored: (next: Resume) => void;
}) {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tailorRole, setTailorRole] = useState(resume.target_role || "");
  const [tailorCompany, setTailorCompany] = useState("");

  async function refresh() {
    try {
      const data = await api.listResumeVersions(resume.id);
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
    }
  }

  useEffect(() => {
    void refresh();
  }, [resume.id]);

  async function saveVersion() {
    setBusy(true);
    setError("");
    try {
      await api.createResumeVersion(resume.id, {
        label: label || undefined,
        notes,
        target_company: resume.target_company,
        target_role: resume.target_role,
      });
      setLabel("");
      setNotes("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save version.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(versionId: string) {
    if (!window.confirm("Restore this version? Current content will be snapshotted first.")) return;
    setBusy(true);
    setError("");
    try {
      const { resume: next } = await api.restoreResumeVersion(resume.id, versionId);
      onRestored(next);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not restore version.");
    } finally {
      setBusy(false);
    }
  }

  async function tailorCopy() {
    setBusy(true);
    setError("");
    try {
      const { resume: copy } = await api.createTailoredResumeCopy(resume.id, {
        target_role: tailorRole,
        target_company: tailorCompany,
      });
      navigate(`/admin/resume-builder/${copy.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create tailored copy.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-ink-900">Versions & tailored copies</h2>
      <p className="text-sm text-ink-500">
        Saving a version snapshots the current content. Creating a tailored copy leaves your master
        resume unchanged.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="space-y-3 rounded-xl border border-ink-100 p-4">
        <p className="text-sm font-medium text-ink-800">Save version snapshot</p>
        <input
          className="input-field"
          placeholder="Label (e.g. Senior PM – Company A)"
          value={label}
          disabled={readOnly}
          onChange={(e) => setLabel(e.target.value)}
        />
        <textarea
          className="input-field min-h-20"
          placeholder="Notes"
          value={notes}
          disabled={readOnly}
          onChange={(e) => setNotes(e.target.value)}
        />
        <EditGuard>
          <button type="button" className="btn-secondary" disabled={readOnly || busy} onClick={() => void saveVersion()}>
            Save version
          </button>
        </EditGuard>
      </div>

      <div className="space-y-3 rounded-xl border border-ink-100 p-4">
        <p className="text-sm font-medium text-ink-800">Create tailored copy</p>
        <input
          className="input-field"
          placeholder="Target role"
          value={tailorRole}
          disabled={readOnly}
          onChange={(e) => setTailorRole(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Target company"
          value={tailorCompany}
          disabled={readOnly}
          onChange={(e) => setTailorCompany(e.target.value)}
        />
        <EditGuard>
          <button type="button" className="btn-primary" disabled={readOnly || busy} onClick={() => void tailorCopy()}>
            Create tailored copy
          </button>
        </EditGuard>
      </div>

      <ul className="space-y-2">
        {versions.length === 0 ? (
          <li className="text-sm text-ink-500">No versions saved yet.</li>
        ) : (
          versions.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-100 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-ink-800">{v.label}</p>
                <p className="text-xs text-ink-400">
                  v{v.version_number} · {new Date(v.created_at).toLocaleString()}
                  {v.target_company ? ` · ${v.target_company}` : ""}
                </p>
              </div>
              <EditGuard>
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  disabled={readOnly || busy}
                  onClick={() => void restore(v.id)}
                >
                  Restore
                </button>
              </EditGuard>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function TailorAiPanel({
  resume,
  readOnly,
  onApplySummary,
}: {
  resume: Resume;
  readOnly: boolean;
  onApplySummary: (summary: string) => void;
}) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetCompany, setTargetCompany] = useState(resume.target_company || "");
  const [targetRole, setTargetRole] = useState(resume.target_role || "");
  const [match, setMatch] = useState<ResumeMatchResult | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [before, setBefore] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api
      .getResumeTemplates()
      .then((data) => {
        setAiEnabled(Boolean(data.ai?.enabled));
        setAiMessage(data.ai?.message || "");
      })
      .catch(() => {
        setAiEnabled(false);
        setAiMessage("AI writing assistance is not currently configured.");
      });
  }, []);

  async function runMatch() {
    setBusy(true);
    setError("");
    try {
      const result = await api.resumeMatchIndicator(resume.id, {
        job_description: jobDescription,
        target_role: targetRole,
      });
      setMatch(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Match check failed.");
    } finally {
      setBusy(false);
    }
  }

  async function improveSummary() {
    if (!aiEnabled) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api.resumeAiImproveSummary(resume.id, "professional");
      setBefore(resume.basics.summary || "");
      setSuggestion(result.suggestion);
      setNotice(result.labeled);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runTailor() {
    if (!aiEnabled) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api.resumeAiTailor(resume.id, {
        job_description: jobDescription,
        target_company: targetCompany,
        target_role: targetRole,
      });
      setBefore(resume.basics.summary || "");
      setSuggestion(result.suggested_summary);
      setNotice(result.labeled);
      setMatch({
        indicator: 0,
        breakdown: {},
        matched_keywords: result.matched_keywords || [],
        missing_keywords: result.missing_keywords || [],
        quality_issues: { critical: 0, recommended: 0, optional: 0 },
        disclaimer:
          "Keyword lists from AI tailoring. Run Match Indicator for a transparent coverage score.",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI tailor failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-ink-900">Tailor & AI assistance</h2>
      <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
        {aiMessage ||
          (aiEnabled
            ? "AI writing assistance is available."
            : "AI writing assistance is not currently configured.")}
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-brand-800">{notice}</p> : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink-700">Job description</span>
        <textarea
          className="input-field min-h-36"
          value={jobDescription}
          disabled={readOnly}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description to compare keywords and tailor content."
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input-field"
          placeholder="Target company"
          value={targetCompany}
          disabled={readOnly}
          onChange={(e) => setTargetCompany(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Target role"
          value={targetRole}
          disabled={readOnly}
          onChange={(e) => setTargetRole(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <EditGuard>
          <button type="button" className="btn-secondary" disabled={readOnly || busy} onClick={() => void runMatch()}>
            Run match indicator
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={readOnly || busy || !aiEnabled}
            onClick={() => void improveSummary()}
          >
            <Sparkles className="h-4 w-4" /> Improve summary
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={readOnly || busy || !aiEnabled || !jobDescription.trim()}
            onClick={() => void runTailor()}
          >
            Tailor with AI
          </button>
        </EditGuard>
      </div>

      {match ? (
        <div className="rounded-xl border border-ink-100 p-4">
          {match.indicator > 0 ? (
            <p className="text-2xl font-semibold text-ink-900">
              Match indicator: {match.indicator}
              <span className="ml-2 text-sm font-normal text-ink-500">/ 100</span>
            </p>
          ) : null}
          <p className="mt-2 text-xs text-ink-500">{match.disclaimer}</p>
          {Object.keys(match.breakdown || {}).length > 0 ? (
            <ul className="mt-3 grid gap-1 text-sm text-ink-600 sm:grid-cols-2">
              {Object.entries(match.breakdown).map(([key, value]) => (
                <li key={key}>
                  {key.replace(/_/g, " ")}: {value}%
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-ink-400">Matched keywords</p>
              <p className="mt-1 text-sm text-ink-700">
                {(match.matched_keywords || []).slice(0, 20).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-ink-400">Missing keywords</p>
              <p className="mt-1 text-sm text-ink-700">
                {(match.missing_keywords || []).slice(0, 20).join(", ") || "—"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {suggestion ? (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
            AI suggestion — review before applying
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-ink-500">Before</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{before || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-500">After</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-900">{suggestion}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <EditGuard>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={readOnly}
                onClick={() => {
                  onApplySummary(suggestion);
                  setSuggestion("");
                }}
              >
                Accept
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setSuggestion("")}>
                Reject
              </button>
            </EditGuard>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ExportPdfButton({
  resumeId,
  readOnly,
}: {
  resumeId: number;
  readOnly: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const { blob, filename } = await api.downloadResumePdf(resumeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <EditGuard>
        <button
          type="button"
          className="btn-secondary"
          disabled={readOnly || busy}
          onClick={() => void download()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
      </EditGuard>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
