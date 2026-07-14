import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  FileText,
  LineChart,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "../../api/client";
import { CaseStudyCard } from "../../components/case-study/CaseStudyCard";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PORTFOLIO_SETTINGS } from "../../lib/defaultSettings";
import type { FeedCaseStudyItem } from "../../types";

const HOME = DEFAULT_PORTFOLIO_SETTINGS;

const HERO_LINES = (() => {
  const dot = HOME.hero_title.indexOf(". ");
  if (dot === -1) return { primary: HOME.hero_title, accent: null };
  return {
    primary: HOME.hero_title.slice(0, dot + 1),
    accent: HOME.hero_title.slice(dot + 2),
  };
})();

const BRAND_PILLARS = ["Build", "Showcase", "Measure", "Grow"] as const;

const PLATFORM_HIGHLIGHTS = [
  { icon: LineChart, label: "Professional identity", desc: "Build your legacy—not just a gallery of screens" },
  { icon: FileText, label: "Impact case studies", desc: "Problem → Research → Decisions → Outcomes" },
  { icon: Users, label: "Global community", desc: "Follow, comment, search, and get notified" },
] as const;

function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="mb-8 flex items-end gap-4">
      <span className="font-display text-5xl font-bold leading-none text-brand-100">{n}</span>
      <h2 className="font-display text-3xl font-bold text-ink-950">{children}</h2>
    </div>
  );
}

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
            : await api.getFeed(12);
        if (!cancelled) setFeed(feedResult);
      } catch {
        if (!cancelled) {
          setError(
            feedMode === "following"
              ? "Could not load your following feed. Follow members to see their published work here."
              : "Could not load the discover feed. Please try again shortly.",
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

      {error ? (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        </div>
      ) : null}

      {/* Hero — community & action focus */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-brand-600 to-ink-950" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                Professional Experience Platform
              </p>
              <h1 className="font-display text-4xl font-bold leading-[1.1] text-ink-950 sm:text-5xl lg:text-6xl">
                <span className="block text-brand-600">UXGuard Studio</span>
                <span className="mt-2 block">{HERO_LINES.primary}</span>
                {HERO_LINES.accent ? (
                  <span className="mt-1 block text-brand-600">{HERO_LINES.accent}</span>
                ) : null}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">{HOME.hero_subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={user ? "/admin" : "/admin/register"}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  Start Your Journey
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#latest-studies"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-6 py-4 text-base font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  Explore Case Studies
                </a>
              </div>
              <p className="mt-4 text-sm text-ink-500">Free to start · No card required</p>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-600">
                <li>UX researchers</li>
                <li className="text-ink-300">·</li>
                <li>Designers</li>
                <li className="text-ink-300">·</li>
                <li>Product teams</li>
                <li className="text-ink-300">·</li>
                <li>Public portfolios</li>
              </ul>
            </div>

            <div className="grid gap-3">
              {PLATFORM_HIGHLIGHTS.map(({ icon: Icon, label, desc }, i) => (
                <div
                  key={label}
                  className="card flex items-start gap-4 border-l-4 p-5 shadow-md"
                  style={{ borderLeftColor: `hsl(${190 - i * 15} 70% 45%)` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-900">{label}</p>
                    <p className="mt-1 text-sm text-ink-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-b border-ink-100 bg-ink-50/80">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {[
            { label: "Built for", value: "UX & product teams" },
            { label: "Publish", value: "Impact case studies" },
            { label: "Grow", value: "Audience & credibility" },
          ].map((item) => (
            <div key={item.label} className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{item.label}</p>
              <p className="mt-1 font-display text-xl font-bold text-ink-950">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform bento */}
      <section className="border-b border-ink-100 surface-section-alt">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="01">Your Professional Experience Platform</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="card bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white lg:col-span-5">
              <BarChart3 className="h-8 w-8 text-brand-200" />
              <p className="mt-4 font-display text-2xl font-bold leading-snug">
                More than a portfolio. A professional legacy.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-brand-100">
                <li>· Organize projects & research in one place</li>
                <li>· Publish impact-focused case studies</li>
                <li>· Measure views, likes, and engagement</li>
              </ul>
              <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-200 hover:text-white">
                Learn our story
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {[
                { icon: MessageSquare, title: "Community", desc: "Follow peers, leave feedback, get alerts on new work" },
                { icon: Users, title: "Discover", desc: "Explore evidence-driven case studies worldwide" },
                { icon: FileText, title: "Case studies", desc: "Tell the full story—not just final screens" },
                { icon: Sparkles, title: "UXGuard AI", desc: "Draft case studies, research notes, and portfolio reviews" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card p-5">
                  <Icon className="h-5 w-5 text-brand-600" />
                  <p className="mt-3 font-semibold text-ink-900">{title}</p>
                  <p className="mt-1 text-sm text-ink-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Community feed */}
      <section id="latest-studies" className="border-b border-ink-100 surface-section">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionLabel n="02">Community Feed</SectionLabel>
            <div className="flex flex-wrap gap-2 lg:mb-8">
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
          <p className="-mt-4 mb-10 max-w-2xl text-ink-500">
            Browse published case studies from professionals worldwide.
          </p>

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
                <Link to="/discover" className="btn-primary mt-4 inline-flex">
                  Browse published work
                </Link>
              ) : (
                <Link to="/admin" className="btn-primary mt-4 inline-flex">
                  Be the first to publish
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {feed.slice(0, 12).map((study) => (
                  <CaseStudyCard key={study.id} study={study} showSummary />
                ))}
              </div>
              <div className="mt-10 text-center">
                <Link to="/discover" className="btn-secondary">
                  View all case studies
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-400">UXGuard Studio</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BRAND_PILLARS.map((pillar) => (
              <div
                key={pillar}
                className="rounded-2xl border border-ink-800 bg-ink-900/50 px-4 py-5"
              >
                <p className="font-display text-xl font-bold text-brand-300 sm:text-2xl">{pillar}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-12 font-display text-3xl font-bold sm:text-4xl">Building Professional Legacies.</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-400">
            Publish proof of impact. Get discovered. Grow your practice.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={user ? "/admin" : "/admin/register"}
              className="inline-flex min-h-14 items-center gap-2 rounded-xl bg-brand-500 px-10 py-4 text-base font-semibold text-white transition hover:bg-brand-400"
            >
              Join UXGuard Studio
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-ink-600 px-8 py-3.5 font-semibold text-ink-200 transition hover:border-brand-500 hover:text-white"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
