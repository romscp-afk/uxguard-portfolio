import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  FileCheck,
  FileText,
  LineChart,
  MessageSquare,
  Sparkles,
  Target,
  Users,
  Wand2,
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

const DONE_FOR_YOU = [
  "Discovery call to capture your project and impact",
  "Evidence-driven case study writing",
  "Portfolio-ready formatting and cover guidance",
  "Published directly on your UXGuard Studio profile",
  "UX research, audits, strategy, and mentoring available",
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
            : await api.getFeed();
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
    <div className="min-h-screen">
      <PublicHeader />

      {error ? (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        </div>
      ) : null}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute -right-20 top-0 h-96 w-96 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                {HOME.tagline}
              </p>
              <h1 className="font-display text-4xl font-bold leading-[1.1] text-ink-950 sm:text-5xl lg:text-6xl">
                {HERO_LINES.primary}
                {HERO_LINES.accent ? (
                  <span className="mt-1 block text-brand-600">{HERO_LINES.accent}</span>
                ) : null}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-ink-600">{HOME.hero_subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {BRAND_PILLARS.map((pillar) => (
                  <span
                    key={pillar}
                    className="rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-semibold text-brand-800 shadow-sm"
                  >
                    {pillar}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/admin/register" className="btn-primary">
                  Start Your Journey
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#services" className="btn-secondary">
                  We Work For You
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-1">
              {PLATFORM_HIGHLIGHTS.map(({ icon: Icon, label, desc }, i) => (
                <div
                  key={label}
                  className="card flex items-start gap-4 border-l-4 p-5"
                  style={{ borderLeftColor: `hsl(${190 - i * 15} 70% 45%)` }}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
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

      {/* We Work For You — highlighted */}
      <section id="services" className="border-b border-ink-100 bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end gap-4">
            <span className="font-display text-5xl font-bold leading-none text-brand-800">01</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">Professional services</p>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">We&apos;ll Work For You</h2>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <p className="text-xl leading-relaxed text-ink-200 sm:text-2xl">
                You&apos;ve done the work.{" "}
                <span className="font-semibold text-white">We&apos;ll build the case study.</span>
              </p>
              <p className="mt-4 max-w-2xl leading-relaxed text-ink-400">
                Not everyone has time to write world-class portfolios. UXGuard Studio creates compelling,
                evidence-driven case studies for you—so you can save time, showcase impact, and focus on your
                next opportunity.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="mailto:hello@uxguard.io" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-400">
                  Get your case study done
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-lg border border-ink-600 px-6 py-3 font-semibold text-ink-200 transition hover:border-brand-500 hover:text-white"
                >
                  See all services
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-500/30 bg-brand-600/15 p-6 lg:col-span-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/30">
                  <Wand2 className="h-6 w-6 text-brand-300" />
                </div>
                <div>
                  <p className="font-semibold text-white">Done-for-you case studies</p>
                  <p className="text-xs text-brand-200">Save time · Show impact · Get hired</p>
                </div>
              </div>
              <ul className="space-y-3">
                {DONE_FOR_YOU.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Clock, title: "Save your time", desc: "No more weekend portfolio rebuilds" },
              { icon: FileCheck, title: "We write it", desc: "From your notes to published case study" },
              { icon: Target, title: "Show impact", desc: "Evidence that recruiters and clients trust" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
                <Icon className="h-5 w-5 text-brand-400" />
                <p className="mt-3 font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-ink-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform bento */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="02">Your Professional Experience Platform</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="card bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white lg:col-span-5">
              <BarChart3 className="h-8 w-8 text-brand-200" />
              <p className="mt-4 font-display text-2xl font-bold leading-snug">
                More than a portfolio. A professional legacy.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-brand-100">
                Organize projects, document research, measure impact, and present your journey with
                confidence—far beyond Behance, Dribbble, or a static personal site.
              </p>
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
                { icon: Sparkles, title: "Grow", desc: "Track achievements and build career readiness" },
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
      <section id="discover" className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionLabel n="03">Community Feed</SectionLabel>
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
            Explore published case studies, follow professionals, leave feedback, and get notified when new
            work is shared.
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
            Join the community—or let us build your case study for you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/admin/register"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-8 py-3.5 font-semibold text-white transition hover:bg-brand-400"
            >
              Join UXGuard Studio
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:hello@uxguard.io"
              className="inline-flex items-center gap-2 rounded-lg border border-ink-600 px-8 py-3.5 font-semibold text-ink-200 transition hover:border-brand-500 hover:text-white"
            >
              We&apos;ll work for you
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
