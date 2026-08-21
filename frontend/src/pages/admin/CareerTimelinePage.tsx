import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, EditLink, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type {
  CareerImportDuplicate,
  CareerInsights,
  CareerProfile,
  CareerTimelineEntry,
  CareerTimelineType,
  ResumeSummary,
} from "../../types";

const TYPE_LABELS: Record<CareerTimelineType, string> = {
  employment: "Employment",
  promotion: "Promotion",
  education: "Education",
  project: "Project",
  certification: "Certification",
  award: "Award",
  volunteering: "Volunteering",
  career_break: "Career break",
  milestone: "Milestone",
  custom: "Custom",
};

const FILTERS: Array<"all" | CareerTimelineType> = [
  "all",
  "employment",
  "education",
  "project",
  "certification",
  "promotion",
  "award",
  "volunteering",
  "career_break",
];

function formatRange(entry: CareerTimelineEntry) {
  const start = entry.start_date || "—";
  const end = entry.is_current ? "Present" : entry.end_date || "—";
  return `${start} → ${end}`;
}

export function CareerTimelinePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [entries, setEntries] = useState<CareerTimelineEntry[]>([]);
  const [insights, setInsights] = useState<CareerInsights | null>(null);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | CareerTimelineType>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showBreaks, setShowBreaks] = useState(true);
  const [importResumeId, setImportResumeId] = useState<number | "">("");
  const [duplicates, setDuplicates] = useState<CareerImportDuplicate[]>([]);
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [insightData, resumeData] = await Promise.all([
        api.getCareerInsights(),
        api.listResumes(),
      ]);
      setProfile(insightData.profile);
      setEntries(insightData.entries || []);
      setInsights(insightData.insights);
      setResumes(resumeData.resumes || []);
      if (!importResumeId && resumeData.resumes?.[0]) {
        setImportResumeId(resumeData.resumes[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load career timeline.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    let list = [...entries];
    if (filter !== "all") list = list.filter((item) => item.type === filter);
    if (!showBreaks) list = list.filter((item) => item.type !== "career_break");
    list.sort((a, b) => {
      const cmp = String(a.start_date).localeCompare(String(b.start_date));
      return sort === "newest" ? -cmp : cmp;
    });
    return list;
  }, [entries, filter, showBreaks, sort]);

  async function handleImport() {
    if (!importResumeId) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.importCareerTimelineFromResume(Number(importResumeId));
      setDuplicates(result.duplicates || []);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveDuplicate(
    dup: CareerImportDuplicate,
    action: "merge" | "keep_both" | "replace" | "review_later",
  ) {
    setBusy(true);
    try {
      await api.resolveCareerTimelineMerge([
        {
          action,
          candidate: dup.candidate,
          existing_id: dup.matches[0]?.existing_id,
        },
      ]);
      setDuplicates((prev) => prev.filter((item) => item !== dup));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resolve duplicate.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleHidden(entry: CareerTimelineEntry) {
    setBusy(true);
    try {
      await api.updateCareerTimelineEntry(entry.id, { hidden: !entry.hidden });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(entry: CareerTimelineEntry) {
    if (!window.confirm(`Delete “${entry.title || "this entry"}” from your master timeline?`)) {
      return;
    }
    setBusy(true);
    try {
      await api.deleteCareerTimelineEntry(entry.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveVisibility(visibility: CareerProfile["visibility"]) {
    setBusy(true);
    try {
      const data = await api.updateCareerProfile({
        visibility,
        public_link_enabled: visibility === "public_link",
      });
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update visibility.");
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Career Timeline</h1>
          <p className="mt-1 text-sm text-ink-500">
            Master career history for resume versions. Private by default.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditLink to="/admin/career-timeline/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add milestone
          </EditLink>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <ReadOnlyNotice />
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {insights ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Experience" value={`${insights.total_years || 0} yrs`} />
          <SummaryCard label="Employers" value={String(insights.employer_count)} />
          <SummaryCard label="Roles" value={String(insights.role_count)} />
          <SummaryCard
            label="Current"
            value={insights.current_role?.title || "—"}
            sub={insights.current_role?.organisation}
          />
        </div>
      ) : null}

      {(insights?.gaps?.length || 0) > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" /> Timeline completeness
          </div>
          <p>{insights!.gaps[0].message}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900/90">
            {insights!.gaps.slice(0, 3).map((gap) => (
              <li key={`${gap.after_entry_id}-${gap.before_entry_id}`}>
                {gap.start_date} to {gap.end_date} ({gap.months} months)
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <EditGuard>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-ink-900">Import from resume</h2>
          <p className="mt-1 text-xs text-ink-500">
            Adds entries to your master timeline without changing the resume.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              className="input-field max-w-xs"
              value={importResumeId}
              onChange={(e) => setImportResumeId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Select resume</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary"
              disabled={!importResumeId || busy}
              onClick={() => void handleImport()}
            >
              Import
            </button>
          </div>
        </div>
      </EditGuard>

      {duplicates.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-ink-900">Possible duplicates</h2>
          <p className="text-xs text-ink-500">Choose how to handle each match. Nothing is merged silently.</p>
          {duplicates.map((dup, index) => (
            <div key={index} className="rounded-lg border border-ink-100 bg-ink-50 p-3 text-sm">
              <p className="font-medium text-ink-900">
                {dup.candidate.title} · {dup.candidate.organisation}
              </p>
              <p className="text-xs text-ink-500">
                Matches existing: {dup.matches[0]?.entry.title} ({dup.matches[0]?.confidence})
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => void resolveDuplicate(dup, "merge")}>
                  Merge
                </button>
                <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => void resolveDuplicate(dup, "keep_both")}>
                  Keep both
                </button>
                <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => void resolveDuplicate(dup, "replace")}>
                  Replace existing
                </button>
                <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => void resolveDuplicate(dup, "review_later")}>
                  Review later
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-900">Display & privacy</h2>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2 text-xs lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>
        </div>
        <div className={`mt-3 flex flex-wrap gap-3 ${filtersOpen ? "" : "hidden lg:flex"}`}>
          <select className="input-field max-w-[10rem]" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={showDescriptions} onChange={(e) => setShowDescriptions(e.target.checked)} />
            Descriptions
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={showBreaks} onChange={(e) => setShowBreaks(e.target.checked)} />
            Career breaks
          </label>
          <EditGuard>
            <select
              className="input-field max-w-xs"
              value={profile?.visibility || "private"}
              onChange={(e) => void saveVisibility(e.target.value as CareerProfile["visibility"])}
            >
              <option value="private">Keep profile private</option>
              <option value="employers">Visible to approved employers</option>
              <option value="employers_after_apply">Visible after applying</option>
              <option value="public_link">Public shareable link (coming soon)</option>
            </select>
          </EditGuard>
        </div>
        <div className={`mt-3 flex flex-wrap gap-2 ${filtersOpen ? "" : "max-lg:hidden"}`}>
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === key ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200"
              }`}
            >
              {key === "all" ? "All" : TYPE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-white px-6 py-16 text-center">
          <p className="font-display text-xl text-ink-900">No timeline entries yet</p>
          <p className="mt-2 text-sm text-ink-500">Import from a resume or add a milestone manually.</p>
          <EditLink to="/admin/career-timeline/new" className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add milestone
          </EditLink>
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-ink-200 pl-6">
          {visible.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[1.7rem] top-3 h-3 w-3 rounded-full border-2 border-brand-500 bg-white" />
              <article
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  entry.hidden ? "border-ink-100 opacity-60" : "border-ink-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                      {TYPE_LABELS[entry.type] || entry.type}
                    </p>
                    <h3 className="font-display text-lg font-semibold text-ink-950">{entry.title || "Untitled"}</h3>
                    <p className="text-sm text-ink-600">
                      {[entry.organisation, entry.location].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">{formatRange(entry)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Link to={`/admin/career-timeline/${entry.id}`} className="btn-secondary px-2 py-1 text-xs">
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn-secondary px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => void toggleHidden(entry)}
                      title={entry.hidden ? "Show" : "Hide"}
                    >
                      {entry.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-2 py-1 text-xs text-red-700"
                      disabled={busy}
                      onClick={() => void removeEntry(entry)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-2 py-1 text-xs"
                      onClick={() => navigate("/admin/resume-builder")}
                    >
                      Use in Resume
                    </button>
                  </div>
                </div>
                {showDescriptions && entry.description ? (
                  <p className="mt-3 text-sm text-ink-700">{entry.description}</p>
                ) : null}
                {showDescriptions && entry.achievements?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-600">
                    {entry.achievements.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {entry.skills?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {entry.skills.slice(0, 6).map((skill) => (
                      <span key={skill} className="rounded bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 truncate font-display text-xl font-semibold text-ink-950">{value}</p>
      {sub ? <p className="truncate text-xs text-ink-500">{sub}</p> : null}
    </div>
  );
}
