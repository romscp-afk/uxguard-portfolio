import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { LikeButton } from "../../components/community/LikeButton";
import { ShareBar } from "../../components/community/ShareBar";
import { DocumentMeta } from "../../components/seo/DocumentMeta";
import type { Article } from "../../types";

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

export function ArticleDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeStats, setLikeStats] = useState({ like_count: 0, is_liked: false });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .getArticleBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setArticle(data.article);
        setLikeStats({
          like_count: Number(data.article.like_count) || 0,
          is_liked: Boolean(data.article.is_liked),
        });
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
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <PublicHeader />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="h-10 w-2/3 animate-pulse rounded bg-ink-100" />
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-ink-100" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-ink-50">
        <PublicHeader />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-ink-600">{error || "Article not found."}</p>
          <Link to="/articles" className="btn-secondary mt-6 inline-flex">
            Back to articles
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const sharePath = `/articles/${article.slug}`;
  const description = article.excerpt || article.subtitle || article.title;

  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <DocumentMeta
        title={`${article.title} · UXGuard Studio`}
        description={description}
        image={article.cover_image || undefined}
        url={sharePath}
      />
      <PublicHeader />
      <main>
        <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            to="/articles"
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>

          {article.tags?.length ? (
            <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-brand-700">
              {article.tags.join(" · ")}
            </p>
          ) : null}

          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            {article.title}
          </h1>
          {article.subtitle ? (
            <p className="mt-4 text-xl leading-relaxed text-ink-600">{article.subtitle}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-100 pb-6 text-sm text-ink-500">
            {article.author?.name ? (
              <span className="font-medium text-ink-800">{article.author.name}</span>
            ) : null}
            {article.published_at ? <span>{formatDate(article.published_at)}</span> : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.reading_time_min || 1} min read
            </span>
          </div>

          {article.cover_image ? (
            <div className="mt-8 overflow-hidden rounded-2xl bg-ink-100">
              <img
                src={resolveAssetUrl(article.cover_image)}
                alt=""
                className="max-h-[28rem] w-full object-cover"
              />
            </div>
          ) : null}

          <div
            className="prose prose-ink mt-10 max-w-none prose-headings:font-display prose-a:text-brand-700"
            dangerouslySetInnerHTML={{ __html: article.body_html || "" }}
          />

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ink-100 pt-8">
            <LikeButton
              articleId={article.id}
              initialCount={likeStats.like_count}
              initialLiked={likeStats.is_liked}
              onChange={setLikeStats}
            />
            <ShareBar title={article.title} url={sharePath} summary={description} />
          </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
