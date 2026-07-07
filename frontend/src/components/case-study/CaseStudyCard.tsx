import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { resolveAssetUrl } from "../../api/client";
import { AuthorBadge } from "./AuthorBadge";
import type { AuthorSummary, CaseStudyListItem } from "../../types";

type CardStudy = CaseStudyListItem & { author?: AuthorSummary };

export function CaseStudyCard({
  study,
  username,
}: {
  study: CardStudy;
  username?: string;
}) {
  const authorUsername = username || study.author?.username;
  const href = authorUsername ? `/u/${authorUsername}/${study.slug}` : `/case-studies/${study.slug}`;

  return (
    <Link
      to={href}
      className="group card overflow-hidden transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="aspect-[16/10] overflow-hidden bg-ink-100">
        {study.cover_image ? (
          <img
            src={resolveAssetUrl(study.cover_image)}
            alt={study.title}
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
          <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-brand-600" />
        </div>
        <h3 className="font-display text-xl font-semibold text-ink-900 group-hover:text-brand-700">
          {study.title}
        </h3>
        {study.subtitle ? <p className="mt-2 line-clamp-2 text-sm text-ink-500">{study.subtitle}</p> : null}
        {study.author ? (
          <div className="mt-4">
            <AuthorBadge author={study.author} />
          </div>
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
      </div>
    </Link>
  );
}
