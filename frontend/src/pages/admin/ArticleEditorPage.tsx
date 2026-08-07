import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { UrlOrUploadField } from "../../components/ui/UrlOrUploadField";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError, toStoredAssetUrl } from "../../api/client";
import { isAdmin } from "../../lib/roles";
import type { Article } from "../../types";

const emptyForm: Partial<Article> = {
  title: "",
  subtitle: "",
  excerpt: "",
  body_html: "",
  cover_image: "",
  tags: [],
  status: "draft",
  featured: false,
  slug: "",
};

export function ArticleEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const articleId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const admin = isAdmin(user);

  const [form, setForm] = useState<Partial<Article>>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!admin) {
      setLoading(false);
      setError("Only admins can edit articles for now.");
      return;
    }
    if (isNew) {
      setForm(emptyForm);
      setTagsInput("");
      setLoading(false);
      return;
    }
    if (!Number.isFinite(articleId) || articleId <= 0) {
      navigate("/admin/articles", { replace: true });
      return;
    }

    let cancelled = false;
    setLoading(true);
    api
      .getArticleAdmin(articleId)
      .then(({ article }) => {
        if (cancelled) return;
        setForm(article);
        setTagsInput((article.tags || []).join(", "));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Article not found.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [admin, isNew, articleId, navigate]);

  function updateField<K extends keyof Article>(key: K, value: Article[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: FormEvent, publish?: boolean) {
    e.preventDefault();
    if (!admin) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const nextStatus: Article["status"] =
        publish === true ? "published" : publish === false ? "draft" : form.status || "draft";
      const payload: Partial<Article> = {
        title: form.title?.trim() || "",
        subtitle: form.subtitle || "",
        excerpt: form.excerpt || "",
        body_html: form.body_html || "",
        cover_image: toStoredAssetUrl(form.cover_image) || form.cover_image || null,
        tags,
        featured: Boolean(form.featured),
        slug: form.slug?.trim() || undefined,
        status: nextStatus,
      };

      if (!payload.title) {
        setError("Title is required.");
        setSaving(false);
        return;
      }
      if (payload.status === "published" && !String(payload.body_html || "").trim()) {
        setError("Add article body before publishing.");
        setSaving(false);
        return;
      }

      if (isNew) {
        const { article } = await api.createArticle(payload);
        setNotice(payload.status === "published" ? "Published." : "Draft saved.");
        navigate(`/admin/articles/${article.id}`, { replace: true });
      } else {
        const { article } = await api.updateArticle(articleId, payload);
        setForm(article);
        setTagsInput((article.tags || []).join(", "));
        setNotice(payload.status === "published" ? "Published." : "Saved.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save article.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="card h-48 animate-pulse bg-ink-100" />;
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-6">
        <Link
          to="/admin/articles"
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to articles
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-950">
          {isNew ? "New Article" : "Edit Article"}
        </h1>
        <p className="mt-1 text-ink-500">
          Long-form post for the public Articles section. Readers can like and share once published.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {notice}
          {form.status === "published" && form.slug ? (
            <>
              {" "}
              <a href={`/articles/${form.slug}`} className="font-semibold underline" target="_blank" rel="noreferrer">
                Open live page
              </a>
            </>
          ) : null}
        </div>
      ) : null}

      <EditGuard>
        <form className="card max-w-3xl space-y-5 p-6" onSubmit={(e) => void handleSave(e, false)}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Title</span>
            <input
              className="input-field"
              value={form.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Article title"
              disabled={!admin}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Subtitle</span>
            <input
              className="input-field"
              value={form.subtitle || ""}
              onChange={(e) => updateField("subtitle", e.target.value)}
              placeholder="Optional deck line"
              disabled={!admin}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Excerpt</span>
            <textarea
              className="input-field min-h-[80px]"
              value={form.excerpt || ""}
              onChange={(e) => updateField("excerpt", e.target.value)}
              placeholder="Short blurb for cards and SEO"
              disabled={!admin}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Slug</span>
            <input
              className="input-field font-mono text-sm"
              value={form.slug || ""}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder="auto-from-title"
              disabled={!admin}
            />
            <span className="mt-1 block text-xs text-ink-400">
              Public URL: /articles/{form.slug || "your-slug"}
            </span>
          </label>

          <UrlOrUploadField
            label="Cover image"
            value={form.cover_image || ""}
            onChange={(url) => updateField("cover_image", url)}
            accept="image/*"
            uploadPurpose="media"
          />

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Tags</span>
            <input
              className="input-field"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="design, product, career"
              disabled={!admin}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={Boolean(form.featured)}
              onChange={(e) => updateField("featured", e.target.checked)}
              disabled={!admin}
            />
            Feature on Articles page
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Body</span>
            <RichTextEditor
              value={form.body_html || ""}
              onChange={(html) => updateField("body_html", html)}
              placeholder="Write your article…"
              minHeightClass="min-h-[280px]"
            />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-ink-100 pt-5">
            <button
              type="button"
              className="btn-secondary"
              disabled={saving || !admin}
              onClick={(e) => void handleSave(e, false)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save draft
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving || !admin}
              onClick={(e) => void handleSave(e, true)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Publish
            </button>
            <Link to="/admin/articles" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </EditGuard>
    </div>
  );
}
