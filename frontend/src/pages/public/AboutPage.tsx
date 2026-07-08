import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Linkedin,
  Sparkles,
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
  },
  {
    title: "Evidence Over Assumptions",
    desc: "Research before opinions. Data before decisions. Evidence before assumptions.",
  },
  {
    title: "Professional Excellence",
    desc: "We strive to create products, services, and experiences that inspire trust, quality, and continuous improvement.",
  },
  {
    title: "Continuous Learning",
    desc: "Great professionals never stop learning. Neither do we.",
  },
  {
    title: "Meaningful Impact",
    desc: "Success isn't measured by beautiful screens. It's measured by the value we create for people, businesses, and communities.",
  },
  {
    title: "Building Together",
    desc: "Innovation happens through collaboration. We believe in sharing knowledge, supporting one another, and growing together as a global professional community.",
  },
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

function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-3xl space-y-4 leading-relaxed text-ink-600">{children}</div>;
}

export function AboutPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#e0effe_0%,_transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            About UXGuard Studio
          </p>
          <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight text-ink-950 sm:text-5xl lg:text-6xl">
            Building Professional Legacies.
          </h1>
          <Prose>
            <p className="text-lg text-ink-700">
              At UXGuard Studio, we believe that every project tells a story.
            </p>
            <p>
              Every research insight, every design decision, every product strategy, and every successful
              outcome is the result of countless hours of learning, collaboration, experimentation, and
              problem-solving.
            </p>
            <p>
              Yet, despite the incredible work professionals create every day, much of that knowledge is lost
              across disconnected tools, forgotten documents, presentations, prototypes, reports, and outdated
              portfolios.
            </p>
          </Prose>
          <div className="mt-8 max-w-3xl space-y-2">
            {["The thinking disappears.", "The research disappears.", "The business impact disappears."].map(
              (line) => (
                <p key={line} className="text-lg font-medium text-ink-800">
                  {line}
                </p>
              ),
            )}
          </div>
          <Prose>
            <p className="mt-6 font-medium text-ink-800">We believe professional experience deserves better.</p>
            <p>UXGuard Studio exists to preserve that journey.</p>
            <p>
              We&apos;re building a platform where professionals can organize their work, showcase meaningful
              impact, and build trusted careers while helping organizations discover exceptional talent through
              evidence—not assumptions.
            </p>
            <p className="font-medium text-ink-800">
              Because your portfolio should be more than a collection of projects. It should become your
              professional legacy.
            </p>
          </Prose>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/admin/register" className="btn-primary">
              Start Your Journey
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/#discover" className="btn-secondary">
              Explore the Community
            </Link>
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Who We Are</h2>
          <Prose>
            <p className="mt-6">
              UXGuard Studio is a <strong className="font-semibold text-ink-800">Professional Experience Platform</strong>{" "}
              built for people who create digital products and experiences.
            </p>
            <p>
              Whether you&apos;re a UX Researcher, Product Designer, Product Manager, Business Analyst, Service
              Designer, Developer, or Digital Professional, our mission is to provide the tools, knowledge, and
              support you need to showcase your expertise with confidence.
            </p>
            <p>
              Today, our first product is the <strong className="font-semibold text-ink-800">Portfolio Management System</strong>,
              helping professionals organize projects, build modern portfolios, create compelling case studies,
              and demonstrate measurable impact.
            </p>
            <p>
              Tomorrow, UXGuard Studio will evolve into a complete ecosystem that empowers professionals and
              organizations through research, collaboration, learning, expert services, and intelligent
              technology.
            </p>
          </Prose>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-8">
              <h2 className="font-display text-2xl font-bold text-ink-950">Our Mission</h2>
              <p className="mt-4 leading-relaxed text-ink-600">
                To empower professionals and organizations by transforming experience into evidence, knowledge
                into opportunity, and meaningful work into lasting professional success.
              </p>
              <p className="mt-4 leading-relaxed text-ink-600">
                We believe every professional deserves a trusted platform to preserve their achievements,
                communicate their value, and unlock new opportunities throughout their career.
              </p>
            </div>
            <div className="card p-8">
              <h2 className="font-display text-2xl font-bold text-ink-950">Our Vision</h2>
              <p className="mt-4 leading-relaxed text-ink-600">
                To become the world&apos;s leading Professional Experience Platform, connecting professionals,
                organizations, knowledge, and opportunities through trusted, evidence-driven experiences.
              </p>
              <p className="mt-4 leading-relaxed text-ink-600">
                We envision a future where professional excellence is measured not only by titles or years of
                experience, but by meaningful impact, continuous learning, and the ability to solve real-world
                problems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Why UXGuard Studio Exists</h2>
          <Prose>
            <p className="mt-6 text-lg font-medium text-ink-800">
              Today&apos;s portfolios often focus on outcomes. We believe they should also capture the journey.
            </p>
            <p>A beautiful interface tells only part of the story. Great products are built through research.</p>
          </Prose>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "User interviews",
              "Experiments",
              "Failures",
              "Iterations",
              "Strategic decisions",
              "Cross-functional collaboration",
              "Business outcomes",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-ink-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {item}
              </li>
            ))}
          </ul>
          <Prose>
            <p className="mt-8">
              UXGuard Studio was created to preserve the complete story behind every successful product.
            </p>
            <div className="space-y-1 font-medium text-ink-800">
              <p>Not just what you built.</p>
              <p>But why you built it.</p>
              <p>How you built it.</p>
              <p>And the impact it created.</p>
            </div>
          </Prose>
        </div>
      </section>

      {/* What We Believe */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">What We Believe</h2>
          <p className="mt-3 text-ink-500">We believe that...</p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {BELIEFS.map((belief) => (
              <li key={belief} className="flex items-start gap-3 text-ink-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {belief}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What We Do */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">What We Do</h2>
          <p className="mt-3 max-w-3xl text-ink-500">
            UXGuard Studio helps professionals build their careers through intelligent tools and professional
            services.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="card p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700">Today</h3>
              <ul className="mt-6 space-y-3">
                {TODAY_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400">Coming Soon</h3>
              <ul className="mt-6 space-y-4">
                {COMING_SOON.map(({ name, desc }) => (
                  <li key={name}>
                    <p className="font-semibold text-ink-900">{name}</p>
                    <p className="text-sm text-ink-500">{desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Services */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Professional Services</h2>
          <Prose>
            <p className="mt-6">
              Not everyone has the time or experience to create a world-class portfolio. Not every organization
              has a dedicated UX Research or Product Strategy team.
            </p>
            <p>
              That&apos;s why UXGuard Studio offers professional services alongside our platform. We help
              individuals and organizations save time, showcase impact, and build trusted professional
              identities—with case studies, portfolios, and research done for you when you need it.
            </p>
          </Prose>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROFESSIONAL_SERVICES.map((service) => (
              <li key={service} className="card flex items-center gap-3 p-4 text-sm font-medium text-ink-800">
                <Check className="h-4 w-4 shrink-0 text-brand-600" />
                {service}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-3xl leading-relaxed text-ink-600">
            Whether you&apos;re an individual building your professional identity or a business looking to
            improve your digital products, UXGuard Studio is your trusted partner.
          </p>
          <a href="mailto:hello@uxguard.io" className="btn-primary mt-8 inline-flex">
            Talk to us about your project
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Core Values */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Our Core Values</h2>
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

      {/* Founder Message */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">A Message from the Founder</h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr] lg:items-start">
            <div className="mx-auto w-full max-w-[240px] shrink-0 lg:mx-0">
              <img
                src={FOUNDER_PHOTO}
                alt="Romal Perera, Founder and CEO of UXGuard Studio"
                className="aspect-[4/5] w-full rounded-2xl object-cover object-top shadow-lg ring-4 ring-white"
              />
              <p className="mt-4 text-center text-sm font-semibold text-ink-900 lg:text-left">
                Romal Perera
              </p>
              <p className="text-center text-xs text-ink-500 lg:text-left">Founder &amp; CEO, UXGuard Studio</p>
            </div>
            <div className="card space-y-4 border-l-4 border-l-brand-500 p-8 text-base leading-relaxed text-ink-700">
              <p>Every product begins with an idea.</p>
              <p>
                Every successful product is shaped by research, collaboration, experimentation, and countless
                decisions. Yet behind every great solution are professionals whose knowledge, experience, and
                impact are often scattered across documents, presentations, prototypes, reports, and disconnected
                tools.
              </p>
              <p className="font-medium text-ink-800">Too much valuable work is lost.</p>
              <p className="font-medium text-ink-800">Too many achievements go unnoticed.</p>
              <p className="font-medium text-ink-800">
                Too many professionals struggle to tell the story behind the products they have helped create.
              </p>
              <p>I believe that needs to change.</p>
              <p>
                UXGuard Studio was founded with a simple but ambitious vision: to redefine how professionals
                build, preserve, and showcase their professional legacy.
              </p>
              <p>
                Our mission is to empower UX professionals, Product Managers, Researchers, Business Analysts,
                Designers, Developers, and organizations with a trusted platform that transforms experience
                into evidence and evidence into opportunity.
              </p>
              <p>
                Today, we begin with our Portfolio Management System, helping professionals organize their work,
                showcase meaningful impact, and present themselves with confidence. But this is only the
                beginning.
              </p>
              <p>
                Our vision extends far beyond portfolios. We are building an ecosystem where professionals can
                manage their careers, create world-class case studies, document research, access expert services,
                collaborate with peers, and connect with organizations that value evidence-driven thinking.
              </p>
              <p>
                For businesses, UXGuard Studio will become a trusted partner in understanding users, improving
                digital experiences, and accessing professional expertise through research, strategy, and design
                services.
              </p>
              <p>
                For individuals, it will become a place to learn, grow, demonstrate impact, and unlock new
                opportunities throughout their careers.
              </p>
              <p className="font-medium text-ink-800">We believe great work deserves to be seen.</p>
              <p className="font-medium text-ink-800">Great research deserves to be preserved.</p>
              <p className="font-medium text-ink-800">Great professionals deserve to be recognized.</p>
              <p>
                And every meaningful contribution deserves a place where it can inspire future innovation.
              </p>
              <p>
                This is more than a platform. It is a commitment to building a stronger, more connected
                professional community—one where knowledge is shared, impact is measurable, and careers are built
                on trust, evidence, and continuous learning.
              </p>
              <p>
                Whether you are taking your first step into the industry, leading digital transformation, or
                searching for trusted expertise, we invite you to join us in shaping the future of professional
                excellence.
              </p>
              <p className="font-display text-lg font-bold text-ink-900">Welcome to UXGuard Studio.</p>
              <p className="font-medium text-ink-800">
                Together, let&apos;s build professional legacies that last.
              </p>
              <footer className="border-t border-ink-100 pt-6">
                <p className="font-semibold text-ink-900">— Romal Perera</p>
                <p className="text-sm text-ink-500">Founder &amp; CEO, UXGuard Studio</p>
                <a
                  href={FOUNDER_LINKEDIN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Linkedin className="h-4 w-4" />
                  Connect on LinkedIn
                </a>
              </footer>
            </div>
          </div>
        </div>
      </section>

      {/* Looking Ahead */}
      <section className="border-b border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Looking Ahead</h2>
          <Prose>
            <p className="mt-6 font-medium text-ink-800">Our journey has just begun.</p>
            <p>
              We envision UXGuard Studio becoming more than a software platform. We are building a global
              ecosystem where professionals can learn, collaborate, showcase their work, access expert services,
              discover opportunities, and contribute to the future of UX, Product, Research, and Digital
              Innovation.
            </p>
            <p>
              Every new feature, every product, and every service we introduce will support one purpose: helping
              professionals build meaningful careers while helping organizations create exceptional experiences.
            </p>
          </Prose>
        </div>
      </section>

      {/* Our Promise */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Our Promise</h2>
          <p className="mt-4 max-w-3xl text-ink-600">
            At UXGuard Studio, we promise to continue building products and services that help professionals:
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {PROMISES.map((item) => (
              <li key={item} className="flex items-start gap-3 text-ink-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Brand Promise CTA */}
      <section className="bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Our Brand Promise</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {BRAND_PILLARS.map((pillar, i) => (
              <span key={pillar} className="flex items-center gap-3">
                <span className="font-display text-2xl font-bold sm:text-3xl">{pillar}</span>
                {i < BRAND_PILLARS.length - 1 ? (
                  <span className="text-brand-400" aria-hidden>
                    ·
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <BarChart3 className="mx-auto mt-10 h-8 w-8 text-brand-400" />
          <h2 className="mt-4 font-display text-3xl font-bold">Building Professional Legacies.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-300">
            UXGuard Studio is your Professional Experience Platform—not just another portfolio tool.
          </p>
          <Link
            to="/admin/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-400"
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
