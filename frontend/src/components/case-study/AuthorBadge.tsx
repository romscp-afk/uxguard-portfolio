import { Link } from "react-router-dom";
import type { AuthorSummary } from "../../types";

export function AuthorBadge({ author, className = "" }: { author: AuthorSummary; className?: string }) {
  return (
    <Link
      to={`/u/${author.username}`}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-2 rounded-full bg-ink-50 px-2.5 py-1 transition hover:bg-brand-50 ${className}`}
    >
      {author.avatar_url ? (
        <img src={author.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
          {author.name.charAt(0)}
        </span>
      )}
      <span className="text-xs font-medium text-ink-700 hover:text-brand-700">{author.name}</span>
      {author.title ? <span className="hidden text-xs text-ink-400 sm:inline">· {author.title}</span> : null}
    </Link>
  );
}
