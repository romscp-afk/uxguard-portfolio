import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Linkedin,
  Sparkles,
  Target,
  Compass,
  Layers,
  Heart,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";

const BELIEFS = [
  "Knowledge should never be lost.",
  "Experience should be measurable.",
  "Research should be valued.",
  "Design should solve real problems.",
  "Professionals deserve recognition.",
  "Organizations deserve evidence.",
  "Learning never stops.",
  "Communities grow stronger when knowledge is shared.",
] as const;

const TODAY_FEATURES = [
  "Portfolio Management System",
  "Professional Profiles",
  "Project Management",
  "Portfolio Builder",
  "Resume Builder",
  "Career Timeline",
  "Achievement Tracking",
  "Portfolio Analytics",
] as const;

const COMING_SOON = [
  { name: "UXGuard Case Studies", desc: "Professional Case Study Builder" },
  { name: "UXGuard Research", desc: "Research Repository & Knowledge Hub" },
  { name: "UXGuard AI", desc: "AI-powered Professional Writing & Research Assistant" },
  { name: "UXGuard Experts", desc: "Professional UX, Product & Research Services" },
  { name: "UXGuard Marketplace", desc: "Hire trusted UX & Product professionals" },
  { name: "UXGuard Academy", desc: "Courses, Templates, Certifications & Mentoring" },
] as const;

const PROFESSIONAL_SERVICES = [
  "UX Research",
  "Product Discovery",
  "UX Audits",
  "Accessibility Reviews",
  "UX Case Study Creation",
  "Portfolio Development",
  "Product Strategy",
  "Journey Mapping",
  "User Personas",
  "Research Reports",
  "Design Reviews",
  "Career Mentoring",
  "LinkedIn Optimization",
  "Resume Review",
] as const;

const VALUES = [
  {
    title: "People First",
    desc: "Technology exists to improve people's lives. Every product begins with understanding human needs.",
    icon: Heart,
    accent: "from-rose-50 to-white",
  },
  {
    title: "Evidence Over Assumptions",
    desc: "Research before opinions. Data before decisions. Evidence before assumptions.",
    icon: Target,
    accent: "from-brand-50 to-white",
  },
  {
    title: "Professional Excellence",
    desc: "We strive to create products, services, and experiences that inspire trust, quality, and continuous improvement.",
    icon: Sparkles,
    accent: "from-amber-50 to-white",
  },
  {
    title: "Continuous Learning",
    desc: "Great professionals never stop learning. Neither do we.",
    icon: Compass,
    accent: "from-sky-50 to-white",
  },
  {
    title: "Meaningful Impact",
    desc: "Success isn't measured by beautiful screens. It's measured by the value we create for people, businesses, and communities.",
    icon: BarChart3,
    accent: "from-emerald-50 to-white",
  },
  {
    title: "Building Together",
    desc: "Innovation happens through collaboration. We believe in sharing knowledge, supporting one another, and growing together as a global professional community.",
    icon: Layers,
    accent: "from-violet-50 to-white",
  },
] as const;

const JOURNEY_STEPS = [
  "User interviews",
  "Experiments",
  "Failures",
  "Iterations",
  "Strategic decisions",
  "Cross-functional collaboration",
  "Business outcomes",
] as const;

const LOST_ITEMS = [
  { label: "Thinking", detail: "scattered across decks and docs" },
  { label: "Research", detail: "buried in folders and tools" },
  { label: "Business impact", detail: "lost when portfolios refresh" },
] as const;

const PROMISES = [
  "Build with purpose.",
  "Document their journey.",
  "Showcase measurable impact.",
  "Learn continuously.",
  "Share knowledge openly.",
  "Connect with opportunities.",
  "Leave a lasting professional legacy.",
] as const;

const BRAND_PILLARS = ["Build", "Showcase", "Measure", "Grow"] as const;

const FOUNDER_LINKEDIN = "https://www.linkedin.com/in/romalperera/";
const FOUNDER_PHOTO = "/founder-romal-perera.png";

function SectionLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="mb-8 flex items-end gap-4">
      <span className="font-display text-5xl font-bold leading-none text-brand-100">{n}</span>
      <h2 className="font-display text-3xl font-bold text-ink-950">{children}</h2>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero — split editorial layout */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute -right-20 top-0 h-96 w-96 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                About UXGuard Studio
              </p>
              <h1 className="font-display text-4xl font-bold leading-[1.1] text-ink-950 sm:text-5xl lg:text-6xl">
                Building
                <span className="block text-brand-600">Professional Legacies.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-ink-600">
                Every project tells a story—research, design, strategy, and outcomes shaped by learning,
                collaboration, and problem-solving. UXGuard Studio exists to preserve that journey.
              </p>
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
                <Link to="/#discover" className="btn-secondary">
                  Explore the Community
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">What gets lost today</p>
              {LOST_ITEMS.map(({ label, detail }, i) => (
                <div
                  key={label}
                  className="card flex items-center justify-between gap-4 border-l-4 p-5"
                  style={{ borderLeftColor: `hsl(${190 - i * 12} 70% 45%)` }}
                >
                  <div>
                    <p className="font-display text-xl font-bold text-ink-900">{label}</p>
                    <p className="text-sm text-ink-500">{detail}</p>
                  </div>
                  <span className="text-3xl font-bold text-ink-100">{String(i + 1).padStart(2, "0")}</span>
                </div>
              ))}
              <p className="rounded-xl bg-ink-950 px-5 py-4 text-sm font-medium leading-relaxed text-white">
                We believe professional experience deserves better. Your portfolio should become your{" "}
                <span className="text-brand-300">professional legacy</span>—not just a collection of projects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who we are — bento grid */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="01">Who We Are</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="card bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">Our platform</p>
              <p className="mt-4 font-display text-2xl font-bold leading-snug sm:text-3xl">
                A Professional Experience Platform for people who create digital products and experiences.
              </p>
              <p className="mt-4 leading-relaxed text-brand-100">
                UX Researchers, Product Designers, Product Managers, Business Analysts, Service Designers,
                Developers, and Digital Professionals—tools, knowledge, and support to showcase expertise with
                confidence.
              </p>
            </div>
            <div className="card p-8 lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Today</p>
              <p className="mt-3 font-display text-xl font-bold text-ink-950">Portfolio Management System</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                Organize projects, build modern portfolios, create compelling case studies, and demonstrate
                measurable impact.
              </p>
            </div>
            <div className="card border-dashed border-brand-300 bg-brand-50/40 p-8 lg:col-span-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Tomorrow</p>
              <p className="mt-3 max-w-4xl text-lg leading-relaxed text-ink-700">
                A complete ecosystem empowering professionals and organizations through research, collaboration,
                learning, expert services, and intelligent technology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision — offset cards */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="02">Mission &amp; Vision</SectionLabel>
          <div className="relative grid gap-6 lg:grid-cols-2">
            <div className="card relative z-10 p-8 lg:-rotate-1">
              <Target className="h-8 w-8 text-brand-600" />
              <h3 className="mt-4 font-display text-2xl font-bold text-ink-950">Our Mission</h3>
              <p className="mt-4 leading-relaxed text-ink-600">
                To empower professionals and organizations by transforming experience into evidence, knowledge
                into opportunity, and meaningful work into lasting professional success.
              </p>
              <p className="mt-4 leading-relaxed text-ink-600">
                Every professional deserves a trusted platform to preserve achievements, communicate value, and
                unlock new opportunities throughout their career.
              </p>
            </div>
            <div className="card bg-ink-950 p-8 text-white lg:rotate-1 lg:translate-y-6">
              <Compass className="h-8 w-8 text-brand-400" />
              <h3 className="mt-4 font-display text-2xl font-bold">Our Vision</h3>
              <p className="mt-4 leading-relaxed text-ink-300">
                To become the world&apos;s leading Professional Experience Platform—connecting professionals,
                organizations, knowledge, and opportunities through trusted, evidence-driven experiences.
              </p>
              <p className="mt-4 leading-relaxed text-ink-300">
                Excellence measured by meaningful impact, continuous learning, and solving real-world problems—not
                titles alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why we exist — journey timeline */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="03">Why We Exist</SectionLabel>
          <p className="-mt-4 mb-10 max-w-2xl text-lg text-ink-600">
            Portfolios often show outcomes. We capture the <strong className="font-semibold text-ink-800">journey</strong>{" "}
            behind every successful product.
          </p>
          <div className="flex flex-wrap gap-2">
            {JOURNEY_STEPS.map((step, i) => (
              <span
                key={step}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-700 shadow-sm ring-1 ring-ink-100"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </span>
                {step}
              </span>
            ))}
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["Not just what you built.", "But why you built it.", "How you built it.", "The impact it created."].map(
              (line, i) => (
                <div
                  key={line}
                  className={`rounded-2xl p-6 ${i === 3 ? "bg-brand-600 text-white sm:col-span-2 lg:col-span-1" : "card"}`}
                >
                  <p className={`font-display text-lg font-bold ${i === 3 ? "text-white" : "text-ink-900"}`}>
                    {line}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Beliefs — mosaic */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="04">What We Believe</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BELIEFS.map((belief, i) => (
              <div
                key={belief}
                className={`rounded-2xl border border-ink-100 p-5 ${
                  i === 0 || i === 7 ? "bg-brand-50/60 sm:col-span-2 lg:col-span-2" : "bg-ink-50/50"
                }`}
              >
                <p className="font-medium leading-snug text-ink-800">{belief}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we do — roadmap */}
      <section className="border-b border-ink-100 bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="05">
            <span className="text-white">What We Do</span>
          </SectionLabel>
          <p className="-mt-4 mb-10 max-w-2xl text-ink-300">
            Intelligent tools and professional services to build careers on evidence—not assumptions.
          </p>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="rounded-2xl border border-brand-500/30 bg-brand-600/20 p-6 lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-300">Live now</p>
              <ul className="mt-5 space-y-2.5">
                {TODAY_FEATURES.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white">
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-ink-700 bg-ink-900/80 p-6 lg:col-span-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Coming soon</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {COMING_SOON.map(({ name, desc }) => (
                  <div key={name} className="rounded-xl bg-ink-800/60 p-4">
                    <p className="font-semibold text-brand-200">{name}</p>
                    <p className="mt-1 text-xs text-ink-400">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional services */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="06">Professional Services</SectionLabel>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <p className="text-lg leading-relaxed text-ink-600">
                Not everyone has time to build a world-class portfolio. Not every organization has a dedicated UX
                or product strategy team.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink-500">
                We help individuals and organizations save time—with case studies, portfolios, and research done
                for you when you need it.
              </p>
              <a href="mailto:hello@uxguard.io" className="btn-primary mt-6 inline-flex">
                Talk to us
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="flex flex-wrap gap-2 lg:col-span-2 lg:content-start">
              {PROFESSIONAL_SERVICES.map((service) => (
                <span
                  key={service}
                  className="rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="07">Our Core Values</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(({ title, desc, icon: Icon, accent }) => (
              <div key={title} className={`card bg-gradient-to-br ${accent} p-6`}>
                <Icon className="h-5 w-5 text-brand-600" />
                <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder — magazine layout */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_#e0effe_0%,_transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionLabel n="08">A Message from the Founder</SectionLabel>

          <div className="mt-4 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-ink-100">
                  <img
                    src={FOUNDER_PHOTO}
                    alt="Romal Perera, Founder of UXGuard Studio"
                    className="aspect-[4/5] w-full object-cover object-top"
                  />
                </div>
                <div className="mt-5">
                  <p className="font-display text-xl font-bold text-ink-950">Romal Perera</p>
                  <p className="text-sm text-ink-500">Founder, UXGuard Studio</p>
                  <a
                    href={FOUNDER_LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    <Linkedin className="h-4 w-4" />
                    Connect on LinkedIn
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-8 lg:col-span-8">
              <blockquote className="border-l-4 border-brand-500 pl-6">
                <p className="font-display text-2xl font-bold leading-snug text-ink-900 sm:text-3xl">
                  &ldquo;Every product begins with an idea—but too much valuable work is lost, unnoticed, and
                  untold.&rdquo;
                </p>
              </blockquote>

              <div className="columns-1 gap-8 space-y-4 text-base leading-relaxed text-ink-600 sm:columns-2">
                <p>
                  Every successful product is shaped by research, collaboration, experimentation, and countless
                  decisions. Yet behind every great solution are professionals whose knowledge is scattered across
                  documents, presentations, prototypes, reports, and disconnected tools.
                </p>
                <p className="font-medium text-ink-800">I believe that needs to change.</p>
                <p>
                  UXGuard Studio was founded to redefine how professionals build, preserve, and showcase their
                  professional legacy—transforming experience into evidence and evidence into opportunity.
                </p>
                <p>
                  Today we begin with our Portfolio Management System. Tomorrow, an ecosystem for careers, case
                  studies, research, expert services, and evidence-driven collaboration.
                </p>
                <p>
                  For businesses: a trusted partner in understanding users and improving digital experiences. For
                  individuals: a place to learn, grow, demonstrate impact, and unlock new opportunities.
                </p>
                <p className="font-medium text-ink-800">
                  Great work deserves to be seen. Great research deserves to be preserved. Great professionals
                  deserve to be recognized.
                </p>
                <p>
                  This is a commitment to a stronger, more connected community—where knowledge is shared, impact
                  is measurable, and careers are built on trust and evidence.
                </p>
              </div>

              <div className="rounded-2xl bg-ink-950 p-8 text-white">
                <p className="font-display text-xl font-bold">Welcome to UXGuard Studio.</p>
                <p className="mt-2 text-brand-200">
                  Together, let&apos;s build professional legacies that last.
                </p>
                <p className="mt-6 text-sm text-ink-400">— Romal Perera, Founder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Looking ahead + promise */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionLabel n="09">Looking Ahead</SectionLabel>
              <p className="-mt-4 text-lg leading-relaxed text-ink-600">
                Our journey has just begun. We are building a global ecosystem where professionals learn,
                collaborate, showcase work, access expert services, and shape the future of UX, Product, and
                Digital Innovation.
              </p>
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-ink-950">Our Promise</h3>
              <ul className="mt-6 space-y-3">
                {PROMISES.map((item) => (
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

      {/* Brand CTA */}
      <section className="bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-400">Our Brand Promise</p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {BRAND_PILLARS.map((pillar) => (
              <div
                key={pillar}
                className="rounded-2xl border border-ink-800 bg-ink-900/50 px-4 py-6 transition hover:border-brand-500/50"
              >
                <p className="font-display text-2xl font-bold text-brand-300 sm:text-3xl">{pillar}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-12 font-display text-3xl font-bold sm:text-4xl">Building Professional Legacies.</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-400">
            Join UXGuard Studio—your Professional Experience Platform.
          </p>
          <Link
            to="/admin/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-8 py-3.5 font-semibold text-white transition hover:bg-brand-400"
          >
            Join UXGuard Studio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
