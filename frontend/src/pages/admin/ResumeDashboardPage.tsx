import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Archive,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, EditLink, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type { ResumeStatus, ResumeSummary } from "../../types";

type SortKey = "updated_desc" | "updated_asc" | "newest" | "oldest" | "name";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  completed: "Completed",
  archived: "Archived",
};

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function ResumeDashboardPage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ResumeStatus>("all");
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api.listResumes();
      setResumes(data.resumes || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load resumes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const active = resumes.filter((r) => r.status !== "deleted");
    const completed = active.filter((r) => r.status === "completed").length;
    const drafts = active.filter((r) => r.status === "draft").length;
    const lastUpdated = [...active].sort((a, b) =>
      String(b.updated_at).localeCompare(String(a.updated_at)),
    )[0];
    return {
      total: active.length,
      completed,
      drafts,
      lastUpdated,
    };
  }, [resumes]);

  const filtered = useMemo(() => {
    let list = [...resumes];
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.target_role || "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "oldest") return String(a.created_at).localeCompare(String(b.created_at));
      if (sort === "newest") return String(b.created_at).localeCompare(String(a.created_at));
      if (sort === "updated_asc") return String(a.updated_at).localeCompare(String(b.updated_at));
      return String(b.updated_at).localeCompare(String(a.updated_at));
    });
    return list;
  }, [resumes, query, statusFilter, sort]);

  async function handleDuplicate(resume: ResumeSummary) {
    setBusyId(resume.id);
    setError("");
    try {
      const { resume: copy } = await api.duplicateResume(resume.id);
      setMenuOpenId(null);
      navigate(`/admin/resume-builder/${copy.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not duplicate resume.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRename(resume: ResumeSummary) {
    const next = window.prompt("Rename resume", resume.title);
    if (next == null) return;
    const title = next.trim();
    if (!title) return;
    setBusyId(resume.id);
    setError("");
    try {
      const { resume: updated } = await api.renameResume(resume.id, title);
      setResumes((prev) =>
        prev.map((item) =>
          item.id === resume.id
            ? { ...item, title: updated.title, updated_at: updated.updated_at }
            : item,
        ),
      );
      setMenuOpenId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not rename resume.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(resume: ResumeSummary) {
    setBusyId(resume.id);
    setError("");
    try {
      const { resume: updated } = await api.archiveResume(resume.id);
      setResumes((prev) =>
        prev.map((item) =>
          item.id === resume.id
            ? {
                ...item,
                status: updated.status,
                updated_at: updated.updated_at,
              }
            : item,
        ),
      );
      setMenuOpenId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not archive resume.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(resume: ResumeSummary) {
    if (
      !window.confirm(
        `Delete “${resume.title}”? It will be soft-deleted and can be recovered by an admin if needed.`,
      )
    ) {
      return;
    }
    setBusyId(resume.id);
    setError("");
    try {
      await api.deleteResume(resume.id);
      setResumes((prev) => prev.filter((item) => item.id !== resume.id));
      setMenuOpenId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete resume.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDownload(resume: ResumeSummary) {
    setBusyId(resume.id);
    setError("");
    try {
      const { blob, filename } = await api.downloadResumePdf(resume.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMenuOpenId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download PDF.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">My Resumes</h1>
          <p className="mt-1 text-ink-500">Create, tailor and manage professional resumes.</p>
        </div>
        <EditLink to="/admin/resume-builder/new">
          <Plus className="h-4 w-4" />
          Create New Resume
        </EditLink>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total resumes", value: stats.total },
          { label: "Completed", value: stats.completed },
          { label: "Drafts", value: stats.drafts },
          {
            label: "Last updated",
            value: stats.lastUpdated ? formatDate(stats.lastUpdated.updated_at) : "—",
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-ink-100 bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search resumes</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input-field w-full pl-9"
            placeholder="Search by name or target role"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          className="input-field lg:w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ResumeStatus)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="input-field lg:w-52"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort resumes"
        >
          <option value="updated_desc">Recently updated</option>
          <option value="updated_asc">Oldest updated</option>
          <option value="newest">Newest created</option>
          <option value="oldest">Oldest created</option>
          <option value="name">Resume name</option>
        </select>
      </div>

      {loading ? (
        <div className="card h-40 animate-pulse bg-ink-100" aria-busy="true" />
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-ink-300" />
          <p className="mt-4 text-sm text-ink-500">
            {resumes.length === 0
              ? "No resumes yet. Create your first resume to get started."
              : "No resumes match your filters."}
          </p>
          {resumes.length === 0 ? (
            <EditGuard>
              <EditLink to="/admin/resume-builder/new" className="btn-primary mt-4 inline-flex">
                Create New Resume
              </EditLink>
            </EditGuard>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((resume) => (
            <article
              key={resume.id}
              className="card relative flex flex-col overflow-hidden transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-ink-50 to-brand-50">
                <FileText className="h-8 w-8 text-brand-500" aria-hidden />
                <span className="sr-only">Template preview placeholder</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-ink-900">{resume.title}</h2>
                    <p className="mt-1 truncate text-sm text-ink-500">
                      {resume.target_role || "No target role"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
                    {STATUS_LABELS[resume.status] || resume.status}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                    <span>Completion</span>
                    <span>{resume.completion_percentage ?? 0}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.min(100, resume.completion_percentage || 0)}%` }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs text-ink-400">
                  Updated {formatDate(resume.updated_at)} · Created {formatDate(resume.created_at)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/admin/resume-builder/${resume.id}`} className="btn-primary text-sm">
                    Continue editing
                  </Link>
                  <Link
                    to={`/admin/resume-builder/${resume.id}?tab=preview`}
                    className="btn-secondary text-sm"
                  >
                    Preview
                  </Link>
                  <EditGuard>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      disabled={busyId === resume.id}
                      onClick={() => void handleDownload(resume)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-sm text-red-700 hover:bg-red-50"
                      disabled={busyId === resume.id}
                      onClick={() => void handleDelete(resume)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </EditGuard>
                  <div className="relative ml-auto">
                    <button
                      type="button"
                      className="btn-ghost px-2"
                      aria-label={`More actions for ${resume.title}`}
                      aria-expanded={menuOpenId === resume.id}
                      onClick={() =>
                        setMenuOpenId((prev) => (prev === resume.id ? null : resume.id))
                      }
                      disabled={busyId === resume.id}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpenId === resume.id ? (
                      <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-ink-100 bg-white py-1 shadow-lg">
                        <EditGuard>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                            onClick={() => void handleDuplicate(resume)}
                          >
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                            onClick={() => void handleRename(resume)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Rename
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                            onClick={() => void handleArchive(resume)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                            {resume.status === "archived" ? "Unarchive" : "Archive"}
                          </button>
                        </EditGuard>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
