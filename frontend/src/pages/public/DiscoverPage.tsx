import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { api } from "../../api/client";
import { CaseStudyCard } from "../../components/case-study/CaseStudyCard";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { useAuth } from "../../context/AuthContext";
import type { FeedCaseStudyItem } from "../../types";

export function DiscoverPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedCaseStudyItem[]>([]);
  const [feedMode, setFeedMode] = useState<"all" | "following">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const feedResult =
          feedMode === "following" && user
            ? await api.getFollowingFeed()
            : await api.getFeed();
        if (!cancelled) setFeed(feedResult);
      } catch {
        if (!cancelled) {
          setError(
            feedMode === "following"
              ? "Could not load your following feed. Follow members to see their published work here."
              : "Could not load case studies. Please try again shortly.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [feedMode, user?.id]);

  return (
    <div className="min-h-screen surface-page">
      <PublicHeader />

      <section className="border-b border-ink-100 surface-section">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Community</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-950">Discover Case Studies</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Explore all published case studies from professionals worldwide. Follow peers and get
            notified when new work is shared.
          </p>
        </div>
      </section>

      <section className="surface-section-alt">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          {error ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          ) : null}

          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFeedMode("all")}
              className={feedMode === "all" ? "btn-primary py-2 text-sm" : "btn-secondary py-2 text-sm"}
            >
              All published
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => setFeedMode("following")}
                className={
                  feedMode === "following" ? "btn-primary py-2 text-sm" : "btn-secondary py-2 text-sm"
                }
              >
                <Users className="h-4 w-4" />
                Following
              </button>
            ) : (
              <Link to="/admin/login" className="btn-secondary py-2 text-sm">
                Sign in to follow
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card h-80 animate-pulse bg-ink-100" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-ink-500">
                {feedMode === "following"
                  ? "No case studies from people you follow yet."
                  : "No published case studies yet."}
              </p>
              {feedMode === "following" ? (
                <Link to="/discover" className="btn-primary mt-4 inline-flex">
                  Browse published work
                </Link>
              ) : (
                <Link to="/admin/register" className="btn-primary mt-4 inline-flex">
                  Be the first to publish
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {feed.map((study) => (
                <CaseStudyCard key={study.id} study={study} showSummary />
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
