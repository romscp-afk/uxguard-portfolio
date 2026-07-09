import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Search, UserRound } from "lucide-react";
import { api } from "../../api/client";
import { CaseStudyCard } from "../../components/case-study/CaseStudyCard";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import type { SearchResults } from "../../types";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }

    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const data = await api.search(q);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setError("Search failed. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    setSearchParams({ q: trimmed });
  }

  const totalResults = (results?.users.length || 0) + (results?.case_studies.length || 0);

  return (
    <div className="min-h-screen surface-page">
      <PublicHeader />

      <section className="border-b border-ink-100 dark:border-ink-800 surface-section">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-3xl font-bold text-ink-950">Search the community</h1>
          <p className="mt-2 text-ink-500">
            Find researchers, designers, case studies, methods, clients, and impact stories.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                className="input-field pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people, projects, methods, impact..."
              />
            </div>
            <button type="submit" className="btn-primary shrink-0">
              Search
            </button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {loading ? (
          <div className="flex items-center gap-2 text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        ) : results ? (
          <>
            <p className="mb-8 text-sm text-ink-500">
              {totalResults} result{totalResults === 1 ? "" : "s"} for &ldquo;{results.query}&rdquo;
            </p>

            {results.users.length > 0 ? (
              <div className="mb-12">
                <h2 className="mb-4 font-display text-xl font-bold text-ink-950">People</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.users.map((person) => (
                    <Link
                      key={person.id}
                      to={person.portfolio_url}
                      className="card flex items-start gap-4 p-5 transition hover:border-brand-200"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink-900">{person.name}</p>
                        <p className="text-xs text-brand-600">@{person.username}</p>
                        {person.title ? <p className="mt-1 text-sm text-ink-600">{person.title}</p> : null}
                        {person.bio ? (
                          <p className="mt-2 line-clamp-2 text-sm text-ink-500">{person.bio}</p>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {results.case_studies.length > 0 ? (
              <div>
                <h2 className="mb-4 font-display text-xl font-bold text-ink-950">Case Studies</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {results.case_studies.map((study) => (
                    <CaseStudyCard
                      key={study.id}
                      study={study}
                      username={study.author?.username}
                      showSummary
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {totalResults === 0 ? (
              <div className="card p-10 text-center text-ink-500">
                No matches found. Try another keyword like a method, client, or role.
              </div>
            ) : null}
          </>
        ) : (
          <div className="card p-10 text-center text-ink-500">
            Search across the UXGuard Studio community to discover people and published work.
          </div>
        )}
      </section>

      <PublicFooter />
    </div>
  );
}
