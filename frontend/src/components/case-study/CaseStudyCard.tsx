import { Link } from "react-router-dom";
import { ArrowUpRight, Heart } from "lucide-react";
import { resolveAssetUrl } from "../../api/client";
import { AuthorBadge } from "./AuthorBadge";
import type { AuthorSummary, CaseStudyListItem } from "../../types";

type CardStudy = CaseStudyListItem & { author?: AuthorSummary | null };

function studyHref(study: CardStudy, username?: string): string | null {
  const authorUsername = username || study.author?.username;
  if (!authorUsername || !study.slug) return null;
  return `/u/${encodeURIComponent(authorUsername)}/${encodeURIComponent(study.slug)}`;
}

export function CaseStudyCard({
  study,
  username,
  showSummary = false,
}: {
  study: CardStudy;
  username?: string;
  showSummary?: boolean;
}) {
  const href = studyHref(study, username);

  if (!href) {
    return (
      <article className="card overflow-hidden opacity-60">
        <div className="p-6 text-sm text-ink-500">This case study is unavailable.</div>
      </article>
    );
  }

  return (
    <article className="group card flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      <Link to={href} className="block flex-1">
        <div className="aspect-[16/10] overflow-hidden bg-ink-100">
          {study.cover_image ? (
            <img
              src={resolveAssetUrl(study.cover_image)}
              alt={study.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700">
              <span className="font-display text-xl font-semibold">{study.title.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              {study.client || "Case Study"}
            </span>
            <div className="flex items-center gap-2">
              {(study.like_count || 0) > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-400">
                  <Heart className="h-3.5 w-3.5" />
                  {study.like_count}
                </span>
              ) : null}
              <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-brand-600" />
            </div>
          </div>
          <h3 className="font-display text-xl font-semibold text-ink-900 group-hover:text-brand-700">
            {study.title}
          </h3>
          {study.subtitle ? (
            <p className="mt-2 line-clamp-2 text-sm font-medium text-ink-600">{study.subtitle}</p>
          ) : null}
          {showSummary && study.summary ? (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-500">{study.summary}</p>
          ) : null}
          {study.author?.title || study.author?.bio ? (
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-400">
              {study.author.title ? (
                <span className="font-medium text-ink-600">{study.author.name}</span>
              ) : (
                study.author.name
              )}
              {study.author.title ? ` · ${study.author.title}` : ""}
              {study.author.bio ? ` — ${study.author.bio}` : ""}
            </p>
          ) : null}
          {study.methods.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {study.methods.slice(0, 3).map((method) => (
                <span
                  key={method}
                  className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600"
                >
                  {method}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-4 text-xs font-semibold text-brand-600 group-hover:text-brand-700">
            Read full case study →
          </p>
        </div>
      </Link>
      {study.author ? (
        <div className="border-t border-ink-100 px-6 py-3">
          <AuthorBadge author={study.author} />
        </div>
      ) : null}
    </article>
  );
}
