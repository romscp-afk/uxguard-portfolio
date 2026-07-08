import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, FileText, LineChart, Sparkles, Users } from "lucide-react";
import { api } from "../../api/client";
import { CaseStudyCard } from "../../components/case-study/CaseStudyCard";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PORTFOLIO_SETTINGS } from "../../lib/defaultSettings";
import type { FeedCaseStudyItem } from "../../types";

/** Static homepage copy — never fetched async, so hero text never flashes on load. */
const HOME = DEFAULT_PORTFOLIO_SETTINGS;

export function HomePage() {
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
              : "Could not load the discover feed. Restart with: cd frontend && npm run dev (uses live API). For local backend: ./start.sh",
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
    <div className="min-h-screen">
      <PublicHeader />

      {error ? (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        </div>
      ) : null}

      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#e0effe_0%,_transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              {HOME.tagline}
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink-950 sm:text-5xl lg:text-6xl">
              {HOME.hero_title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-600">{HOME.hero_subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/admin/register" className="btn-primary">
                Start Your Journey
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#discover" className="btn-secondary">
                Explore Case Studies
              </a>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: LineChart,
                label: "Professional identity",
                desc: "Build your legacy—not just a gallery of screens",
              },
              {
                icon: FileText,
                label: "Impact case studies",
                desc: "Problem → Research → Decisions → Outcomes",
              },
              {
                icon: BarChart3,
                label: "Community discover",
                desc: "Follow members, comment on case studies, and get alerts",
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="card p-5">
                <Icon className="h-5 w-5 text-brand-600" />
                <p className="mt-3 font-semibold text-ink-900">{label}</p>
                <p className="mt-1 text-sm text-ink-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="discover" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-ink-950">Community Feed</h2>
            <p className="mt-2 max-w-3xl text-ink-500">
              Explore published case studies, follow professionals, leave feedback, and get notified when
              new work is shared.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
              <Link to="/search" className="btn-primary mt-4 inline-flex">
                Find people to follow
              </Link>
            ) : (
              <Link to="/admin" className="btn-primary mt-4 inline-flex">
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
      </section>

      <section className="border-t border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-bold text-ink-950">More than a portfolio</h2>
              <p className="mt-4 leading-relaxed text-ink-600">
                UXGuard Studio is your professional operating system. Protect your work, organize your
                journey, present your impact—and build a legacy that goes far beyond Behance, Dribbble, or a
                static personal site.
              </p>
            </div>
            <Link to="/about" className="btn-secondary shrink-0">
              About UXGuard Studio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
