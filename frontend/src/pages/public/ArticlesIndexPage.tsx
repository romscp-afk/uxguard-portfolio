import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock } from "lucide-react";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { DocumentMeta } from "../../components/seo/DocumentMeta";
import type { ArticleListItem } from "../../types";

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function ArticlesIndexPage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .listArticles()
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

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <DocumentMeta
        title="Articles · UXGuard Studio"
        description="Stories, product thinking, and career notes from UXGuard Studio."
        url="/articles"
      />
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Journal</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Articles
          </h1>
          <p className="mt-3 text-lg text-ink-600">
            Long-form writing on product, design, and building professional work.
          </p>
        </header>

        {error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-ink-100" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="mt-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-ink-300" />
            <p className="mt-3 text-ink-600">No articles published yet. Check back soon.</p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-8 md:grid-cols-2">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  to={`/articles/${article.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:border-brand-200 hover:shadow-md"
                >
                  {article.cover_image ? (
                    <div className="aspect-[16/9] overflow-hidden bg-ink-100">
                      <img
                        src={resolveAssetUrl(article.cover_image)}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-ink-100 to-brand-50">
                      <BookOpen className="h-10 w-10 text-ink-300" />
                    </div>
                  )}
                  <div className="p-6">
                    {article.tags?.length ? (
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                        {article.tags.slice(0, 3).join(" · ")}
                      </p>
                    ) : null}
                    <h2 className="mt-2 font-display text-xl font-bold text-ink-950 group-hover:text-brand-800">
                      {article.title}
                    </h2>
                    {article.subtitle || article.excerpt ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-600">
                        {article.subtitle || article.excerpt}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-400">
                      {article.author?.name ? <span>{article.author.name}</span> : null}
                      {article.published_at ? <span>{formatDate(article.published_at)}</span> : null}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {article.reading_time_min || 1} min
                      </span>
                      {typeof article.like_count === "number" ? (
                        <span>{article.like_count} likes</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
