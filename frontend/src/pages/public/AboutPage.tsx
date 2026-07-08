import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Check,
  GraduationCap,
  Layers,
  LineChart,
  PenLine,
  Shield,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";

const PILLARS = ["Protect", "Organize", "Present", "Impact"] as const;

const TRADITIONAL_LIMITS = [
  "Screens only",
  "Static pages",
  "No research process",
  "Difficult to maintain",
  "No analytics",
  "No measurable impact",
] as const;

const STUDIO_STRENGTHS = [
  "Complete project lifecycle",
  "Research repository",
  "Case study builder",
  "AI-assisted writing",
  "Professional analytics",
  "Impact measurement",
  "Career growth dashboard",
  "Professional branding",
] as const;

const AUDIENCES = [
  {
    title: "UX Researchers",
    desc: "Document research from planning to synthesis.",
    icon: BookOpen,
  },
  {
    title: "Product Designers",
    desc: "Showcase design thinking—not just final interfaces.",
    icon: PenLine,
  },
  {
    title: "Product Managers",
    desc: "Present product strategy, roadmaps, KPIs, and business outcomes.",
    icon: Briefcase,
  },
  {
    title: "Business Analysts",
    desc: "Organize requirements, workshops, user stories, and stakeholder engagement.",
    icon: Layers,
  },
  {
    title: "Service Designers",
    desc: "Capture service blueprints, customer journeys, and ecosystem maps.",
    icon: Target,
  },
  {
    title: "Developers",
    desc: "Show architecture, engineering decisions, and technical leadership.",
    icon: Shield,
  },
  {
    title: "Students & Graduates",
    desc: "Build a professional portfolio before landing your first role.",
    icon: GraduationCap,
  },
  {
    title: "Teams",
    desc: "Collaborate on shared projects and maintain a consistent organizational portfolio.",
    icon: Users,
  },
] as const;

const CAPABILITIES = [
  {
    title: "Projects",
    items: ["Organize every project with structured information."],
  },
  {
    title: "Case Studies",
    items: ["Tell the story behind every solution."],
  },
  {
    title: "UX Research",
    items: ["Store interviews, personas, usability testing, surveys, and research insights."],
  },
  {
    title: "Design Files",
    items: ["Connect Figma, Adobe XD, Sketch, Miro, FigJam, and other design tools."],
  },
  {
    title: "Product Documentation",
    items: ["Requirements", "Roadmaps", "Backlogs", "Business goals", "Success metrics"],
  },
  {
    title: "Achievements",
    items: ["Awards", "Certifications", "Public speaking", "Articles", "Patents", "Research publications"],
  },
  {
    title: "Professional Timeline",
    items: ["Visualize your career progression."],
  },
  {
    title: "Skills Matrix",
    items: ["Track technical, research, leadership, and business skills."],
  },
  {
    title: "Analytics",
    items: [
      "Measure portfolio views",
      "Recruiter engagement",
      "Project popularity",
      "Profile strength",
      "Skill growth",
      "Career readiness",
    ],
  },
] as const;

const WHY_CHOOSE = [
  "Showcase your complete thinking process",
  "Demonstrate measurable business impact",
  "Build trust with recruiters and clients",
  "Keep every project organized",
  "Create beautiful case studies in minutes",
  "Measure your professional growth",
  "Present yourself with confidence",
] as const;

const VALUES = [
  {
    title: "People First",
    desc: "Every product begins by understanding people.",
  },
  {
    title: "Evidence Driven",
    desc: "Research before assumptions. Measure before conclusions.",
  },
  {
    title: "Transparency",
    desc: "Document decisions. Share your thinking. Build trust.",
  },
  {
    title: "Continuous Learning",
    desc: "Your portfolio should evolve with your career.",
  },
  {
    title: "Meaningful Impact",
    desc: "Great work creates measurable value—not just beautiful interfaces.",
  },
] as const;

export function AboutPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#e0effe_0%,_transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            About UXGuard Studio
          </p>
          <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight text-ink-950 sm:text-5xl lg:text-6xl">
            Build More Than a Portfolio.
            <span className="mt-2 block text-brand-700">Build Your Professional Legacy.</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-600">
            UXGuard Studio is an all-in-one professional portfolio management platform built for UX
            Researchers, Product Designers, Product Managers, Service Designers, UX Writers, Business
            Analysts, Researchers, and Digital Professionals.
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-ink-600">
            We believe a portfolio should tell the complete story—not just showcase beautiful screens.
            It should demonstrate how you think, solve problems, influence business decisions, and create
            measurable impact. UXGuard Studio helps professionals organize their work, document their
            process, measure their achievements, and present their journey with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {PILLARS.map((pillar) => (
              <span
                key={pillar}
                className="rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-800"
              >
                {pillar}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/admin/register" className="btn-primary">
              Start Your Journey
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/#discover" className="btn-secondary">
              Explore Case Studies
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Our Story</h2>
          <div className="mt-6 max-w-3xl space-y-4 leading-relaxed text-ink-600">
            <p className="text-lg font-medium text-ink-800">Every designer has projects. Few have evidence.</p>
            <p>
              Most portfolios show the final UI. Very few explain why the problem existed, how research was
              conducted, what decisions were made, how success was measured, or what business value was
              delivered.
            </p>
            <p>
              After spending years working across UX Research, Product Design, Product Strategy, and Human
              Performance, we realized there was no platform built specifically for professionals who wanted
              to showcase their real impact.
            </p>
            <p className="font-medium text-ink-800">
              UXGuard Studio was created to bridge that gap. Because your portfolio should be more than a
              gallery—it should become your professional operating system.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-8">
              <h2 className="font-display text-2xl font-bold text-ink-950">Our Mission</h2>
              <p className="mt-4 leading-relaxed text-ink-600">
                To empower professionals to document, manage, and showcase meaningful work that demonstrates
                measurable impact. We help individuals transform projects into professional stories that
                inspire trust, create opportunities, and accelerate careers.
              </p>
            </div>
            <div className="card p-8">
              <h2 className="font-display text-2xl font-bold text-ink-950">Our Vision</h2>
              <p className="mt-4 leading-relaxed text-ink-600">
                To become the world&apos;s leading professional experience platform where researchers,
                designers, strategists, and product leaders build trusted digital portfolios that represent
                not only what they created—but why it mattered.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">
            What Makes UXGuard Studio Different
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="card p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
                Traditional Portfolio
              </h3>
              <ul className="mt-6 space-y-3">
                {TRADITIONAL_LIMITS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-600">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card border-brand-200 bg-brand-50/30 p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                UXGuard Studio
              </h3>
              <ul className="mt-6 space-y-3">
                {STUDIO_STRENGTHS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Who It&apos;s Built For</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map(({ title, desc, icon: Icon }) => (
              <div key={title} className="card p-5">
                <Icon className="h-5 w-5 text-brand-600" />
                <p className="mt-3 font-semibold text-ink-900">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Everything In One Place</h2>
          <p className="mt-3 max-w-3xl text-ink-500">
            UXGuard Studio helps you manage your entire professional journey.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ title, items }) => (
              <div key={title} className="card p-6">
                <h3 className="font-semibold text-ink-900">{title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-500">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink-950">
                Why Professionals Choose UXGuard Studio
              </h2>
              <ul className="mt-8 space-y-3">
                {WHY_CHOOSE.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card bg-gradient-to-br from-brand-50 to-white p-8">
              <LineChart className="h-8 w-8 text-brand-600" />
              <p className="mt-4 font-display text-xl font-bold text-ink-950">
                The GitHub for UX &amp; Product Professionals
              </p>
              <p className="mt-3 leading-relaxed text-ink-600">
                A place where portfolios are living, measurable, collaborative, and trusted—rather than static
                websites. Build your legacy with evidence, not just screenshots.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Core Values</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(({ title, desc }) => (
              <div key={title} className="card p-6">
                <h3 className="font-semibold text-ink-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Our Philosophy</h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-600">
            We believe professionals shouldn&apos;t have to rebuild their portfolio every time they apply for
            a job. Your work already tells your story. UXGuard Studio simply helps you organize it, connect
            it, measure it, and present it beautifully.
          </p>
        </div>
      </section>

      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Founder Message</h2>
          <blockquote className="card mt-8 border-l-4 border-l-brand-500 p-8">
            <p className="text-lg leading-relaxed text-ink-700">
              &ldquo;For years, I maintained documents, presentations, prototypes, research reports, user
              journeys, product strategies, and case studies across countless folders and tools. Every time I
              applied for a role, I had to rebuild my portfolio from scratch.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-ink-700">
              UXGuard Studio was born from that frustration. It&apos;s the platform I always wished
              existed—a single workspace where professionals can capture their journey, showcase their impact,
              and grow their careers with confidence.&rdquo;
            </p>
            <footer className="mt-6 border-t border-ink-100 pt-6">
              <p className="font-semibold text-ink-900">Romal Perera</p>
              <p className="text-sm text-ink-500">Founder, UXGuard Studio</p>
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <BarChart3 className="mx-auto h-8 w-8 text-brand-600" />
          <h2 className="mt-4 font-display text-3xl font-bold text-ink-950">
            Build Your Legacy. Showcase Your Impact.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-500">
            UXGuard Studio isn&apos;t just another portfolio platform. It&apos;s your professional operating
            system.
          </p>
          <Link to="/admin/register" className="btn-primary mt-8 inline-flex">
            Start Building Today
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
