import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Layers, Sparkles } from "lucide-react";
import { api } from "../../api/client";
import { CaseStudyCard } from "../../components/case-study/CaseStudyCard";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import type { FeedCaseStudyItem, PortfolioSettings } from "../../types";

export function HomePage() {
  const [settings, setSettings] = useState<PortfolioSettings | null>(null);
  const [feed, setFeed] = useState<FeedCaseStudyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getPortfolioSettings(), api.getFeed()])
      .then(([s, items]) => {
        setSettings(s);
        setFeed(items);
      })
      .catch(() =>
        setError(
          "Could not load platform data. If you're running locally, use https://uxguard-portfolio.vercel.app or run ./start.sh from the project root for the full local stack.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

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
              {settings?.tagline || "UX Research Portfolio Platform"}
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink-950 sm:text-5xl lg:text-6xl">
              {settings?.hero_title || "Discover UX research case studies"}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-600">
              {settings?.hero_subtitle ||
                "Browse published work from researchers worldwide. Share your portfolio with a personal link for your CV."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#discover" className="btn-primary">
                Explore Case Studies
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link to="/admin/register" className="btn-secondary">
                Create Your Portfolio
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Layers, label: "Personal portfolios", desc: "Shareable /u/username links" },
              { icon: FileText, label: "Research case studies", desc: "Problem → Method → Impact" },
              { icon: Sparkles, label: "Discover feed", desc: "Latest published work from all users" },
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
        <div className="mb-10">
          <h2 className="font-display text-3xl font-bold text-ink-950">Recently Published</h2>
          <p className="mt-2 text-ink-500">
            Case studies from researchers on UXguard — click an author to view their full portfolio.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-80 animate-pulse bg-ink-100" />
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ink-500">No published case studies yet.</p>
            <Link to="/admin" className="btn-primary mt-4 inline-flex">
              Be the first to publish
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((study) => (
              <CaseStudyCard key={study.id} study={study} />
            ))}
          </div>
        )}
      </section>

      <section id="about" className="border-t border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">About UXguard</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-ink-600">
            {settings?.about ||
              "UXguard helps UX researchers build portfolio case studies with the structure hiring managers expect — and share them with a personal portfolio URL for your CV or LinkedIn."}
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
