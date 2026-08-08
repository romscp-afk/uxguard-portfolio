import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, Trash2 } from "lucide-react";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import { EditGuard, EditLink, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { canEditPlatform } from "../../lib/roles";
import type { ArticleListItem } from "../../types";

function formatDate(value?: string | null) {
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

export function ArticlesListPage() {
  const { user } = useAuth();
  const canEdit = canEditPlatform(user);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .adminListArticles()
      .then((data) => {
        if (!cancelled) setArticles(data.articles || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load articles.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(article: ArticleListItem) {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    setDeletingId(article.id);
    setError("");
    try {
      await api.deleteArticle(article.id);
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete article.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered =
    statusFilter === "all" ? articles : articles.filter((a) => a.status === statusFilter);

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Articles</h1>
          <p className="mt-1 text-ink-500">
            Write Medium-style stories for the public site. Draft private, publish when ready.
          </p>
        </div>
        {canEdit ? (
          <EditLink to="/admin/articles/new">
            <Plus className="h-4 w-4" />
            New Article
          </EditLink>
        ) : null}
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
          {(["all", "published", "draft"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                statusFilter === key
                  ? "bg-ink-900 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {key === "all" ? "All" : key === "published" ? "Published" : "Drafts"}
            </button>
          ))}
        </div>

      {loading ? (
        <div className="card h-40 animate-pulse bg-ink-100" />
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-ink-300" />
          <p className="mt-3 text-ink-600">No articles yet.</p>
          {canEdit ? (
            <EditLink to="/admin/articles/new" className="btn-primary mt-4 inline-flex">
              Write your first article
            </EditLink>
          ) : null}
        </div>
      ) : (
        <EditGuard>
          <ul className="space-y-3">
            {filtered.map((article) => (
              <li key={article.id} className="card flex flex-wrap items-center gap-4 p-4">
                {article.cover_image ? (
                  <img
                    src={resolveAssetUrl(article.cover_image)}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-ink-100">
                    <FileText className="h-6 w-6 text-ink-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/articles/${article.id}`}
                      className="font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {article.title || "Untitled"}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        article.status === "published"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-900"
                      }`}
                    >
                      {article.status}
                    </span>
                    {article.featured ? (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-ink-500">
                    {article.excerpt || article.subtitle || "No excerpt"}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Updated {formatDate(article.updated_at)}
                    {article.status === "published" ? (
                      <>
                        {" · "}
                        <a
                          href={`/articles/${article.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 hover:underline"
                        >
                          View live
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link to={`/admin/articles/${article.id}`} className="btn-secondary text-sm">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    disabled={deletingId === article.id}
                    onClick={() => void handleDelete(article)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </EditGuard>
      )}
    </div>
  );
}
