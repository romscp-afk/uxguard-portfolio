import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Accessibility,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Gauge,
  Layout,
  Loader2,
  MonitorSmartphone,
  MousePointerClick,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { DocumentMeta } from "../../components/seo/DocumentMeta";
import { AuditLeadForm } from "../../components/ux-audit/AuditLeadForm";
import { AuditResultsPanel } from "../../components/ux-audit/AuditResultsPanel";
import { ScoreGauge } from "../../components/ux-audit/ScoreGauge";
import { trackUxAuditEvent } from "../../lib/analytics";
import { validateAuditUrlInput } from "../../lib/ux-audit";
import type { UxAuditPublic } from "../../types/ux-audit";

const PAGE_TYPES = [
  "Company website",
  "Landing page",
  "Ecommerce",
  "SaaS / web application",
  "Portfolio",
  "Other",
];

const GOALS = [
  "Enquiries",
  "Bookings",
  "Sales",
  "Sign-ups",
  "Downloads",
  "Subscriptions",
  "Other",
];

const CONCERNS = [
  "Low enquiries",
  "High bounce rate",
  "Checkout abandonment",
  "Poor mobile performance",
  "Confusing navigation",
  "Weak engagement",
  "Accessibility concerns",
  "Slow website",
  "Unsure what is wrong",
];

const SCAN_STAGES = [
  "Validating website",
  "Reviewing page structure",
  "Checking usability signals",
  "Checking accessibility signals",
  "Checking mobile and performance signals",
  "Preparing your audit report",
];

const SCAN_STAGE_CAP = SCAN_STAGES.length - 1;

const COVERAGE = [
  {
    icon: Layout,
    title: "Usability & navigation",
    desc: "Information architecture, labels, and task flow clarity.",
    checks: ["Heading hierarchy", "Navigation complexity", "Landmarks & semantics"],
  },
  {
    icon: MousePointerClick,
    title: "Conversion journey",
    desc: "Calls-to-action, forms, and paths toward your business goal.",
    checks: ["CTA presence & naming", "Form length", "Empty interactive elements"],
  },
  {
    icon: Sparkles,
    title: "Content & message clarity",
    desc: "Whether visitors can quickly understand your offer.",
    checks: ["Page title", "Meta description", "Trust & contact signals"],
  },
  {
    icon: Accessibility,
    title: "Accessibility",
    desc: "WCAG-oriented checks where technically measurable on the public page.",
    checks: ["Image alt text", "Form labels", "Language attribute"],
  },
  {
    icon: MonitorSmartphone,
    title: "Mobile experience",
    desc: "Viewport, tap targets, and responsive layout signals.",
    checks: ["Viewport meta", "Responsive overflow hints", "Touch target sizing"],
  },
  {
    icon: Gauge,
    title: "Performance & technical",
    desc: "Speed, HTTPS, and technical friction that may affect trust.",
    checks: ["Response time", "HTTPS & mixed content", "Image optimisation hints"],
  },
];

const FAQ = [
  {
    q: "What is a UX audit?",
    a: "A UX audit reviews how easy it is for visitors to understand your offer, complete tasks, and trust your business. Our free health check uses automated signals; an expert audit adds human evaluation of critical flows.",
  },
  {
    q: "Is the audit really free?",
    a: "Yes. The initial automated scan, UX score, category results, and selected findings are free with no payment required.",
  },
  {
    q: "What does UXGuard analyse?",
    a: "We analyse publicly available HTML signals including structure, accessibility indicators, mobile configuration, performance timing, and conversion-oriented elements such as CTAs and forms.",
  },
  {
    q: "Can the audit guarantee more revenue?",
    a: "No. We highlight potential friction and improvement opportunities. Outcomes depend on implementation, audience, and market context. We do not calculate guaranteed revenue gains from an automated scan.",
  },
  {
    q: "Do you need access to my website?",
    a: "No login or technical access is required for the free scan. We fetch your public page over HTTPS using safe, rate-limited server requests.",
  },
  {
    q: "Does the audit include accessibility?",
    a: "Yes, where measurable from the public page HTML. Full WCAG conformance requires expert review and testing across devices and assistive technologies.",
  },
  {
    q: "Can UXGuard help implement the recommendations?",
    a: "Yes. You can request a consultation or expert audit for prioritised roadmaps, design support, and implementation guidance.",
  },
  {
    q: "How is my information stored?",
    a: "Audit URLs and results are stored securely with an unguessable access link. Lead details are only stored if you choose to submit the optional contact form, with separate service and marketing consent.",
  },
  {
    q: "Can I audit a web application behind a login?",
    a: "Not with the free automated scan. Logged-in products require a separately arranged expert audit with authorised access.",
  },
];

function ExamplePreview() {
  const categories = [
    { label: "Usability", score: 78 },
    { label: "Conversion", score: 61 },
    { label: "Accessibility", score: 69 },
    { label: "Mobile", score: 74 },
    { label: "Performance", score: 70 },
    { label: "Content clarity", score: 80 },
  ];
  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-ink-100 bg-brand-50 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-brand-800">
        Example audit result
      </div>
      <div className="grid gap-6 p-6 lg:grid-cols-[auto_1fr]">
        <ScoreGauge score={72} size="sm" />
        <div className="space-y-3">
          <p className="text-sm text-ink-600">Growth opportunity: <span className="font-semibold text-ink-900">Medium–High</span></p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-red-50 px-3 py-1 text-red-800">3 critical issues</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">11 opportunities</span>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-800">5 quick wins</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((c) => (
              <div key={c.label} className="rounded-lg bg-ink-50 px-3 py-2 text-center">
                <p className="text-xs text-ink-500">{c.label}</p>
                <p className="font-bold text-ink-900">{c.score}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UxAuditPage() {
  const navigate = useNavigate();
  const auditRef = useRef<HTMLDivElement>(null);
  const coverageRef = useRef<HTMLElement>(null);

  const [heroUrl, setHeroUrl] = useState("");
  const [heroError, setHeroError] = useState("");

  const [step, setStep] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [pageType, setPageType] = useState(PAGE_TYPES[0]);
  const [primaryGoal, setPrimaryGoal] = useState(GOALS[0]);
  const [primaryAudience, setPrimaryAudience] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [mainConcern, setMainConcern] = useState("");
  const [monthlyTraffic, setMonthlyTraffic] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [targetAction, setTargetAction] = useState("");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState("");

  const [scanStage, setScanStage] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanWaitingLong, setScanWaitingLong] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [audit, setAudit] = useState<UxAuditPublic | null>(null);

  useEffect(() => {
    trackUxAuditEvent("ux_audit_page_view");
  }, []);

  useEffect(() => {
    if (!scanning) {
      setScanWaitingLong(false);
      return;
    }
    const stageTimer = window.setInterval(() => {
      setScanStage((s) => (s < SCAN_STAGE_CAP - 1 ? s + 1 : s));
    }, 2500);
    const longTimer = window.setTimeout(() => setScanWaitingLong(true), 12_000);
    return () => {
      window.clearInterval(stageTimer);
      window.clearTimeout(longTimer);
    };
  }, [scanning]);

  function scrollToAudit() {
    auditRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    trackUxAuditEvent("ux_audit_started");
    setStep(1);
  }

  function startFromHero(e: FormEvent) {
    e.preventDefault();
    const result = validateAuditUrlInput(heroUrl);
    if (!result.ok) {
      setHeroError(result.error);
      return;
    }
    setHeroError("");
    setWebsiteUrl(result.value);
    trackUxAuditEvent("ux_audit_url_submitted");
    scrollToAudit();
  }

  function toggleConcern(c: string) {
    setSelectedConcerns((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  async function runScan() {
    if (scanning) return;
    const urlCheck = validateAuditUrlInput(websiteUrl);
    if (!urlCheck.ok) {
      setSubmitError(urlCheck.error);
      return;
    }

    setScanning(true);
    setScanStage(0);
    setScanWaitingLong(false);
    setSubmitError("");
    trackUxAuditEvent("ux_audit_url_submitted");

    try {
      const result = await api.submitUxAudit({
        website_url: urlCheck.value,
        page_type: pageType,
        primary_goal: primaryGoal,
        primary_audience: primaryAudience || undefined,
        company_name: companyName || undefined,
        industry: industry || undefined,
        main_concern: mainConcern || undefined,
        monthly_traffic_range: monthlyTraffic || undefined,
        current_conversion_rate: conversionRate || undefined,
        target_action: targetAction || undefined,
        concerns: selectedConcerns,
        uxg_hp: honeypot,
      });

      const completed = result.audit;
      if (!completed) {
        throw new ApiError(500, "The server did not return audit results. Please try again.");
      }
      setScanStage(SCAN_STAGE_CAP);
      setAudit(completed);
      setStep(4);
      if (completed.status === "completed") {
        trackUxAuditEvent("ux_audit_scan_completed", { score_band: Math.floor((completed.overall_score || 0) / 10) });
      } else {
        trackUxAuditEvent("ux_audit_scan_failed");
      }
      if (result.results_url && completed.access_token) {
        window.history.replaceState(null, "", `/ux-audit/results/${completed.access_token}`);
      }
    } catch (err) {
      trackUxAuditEvent("ux_audit_scan_failed");
      let message = "Could not complete the audit.";
      if (err instanceof ApiError) {
        message = err.message;
      } else if (err instanceof DOMException && err.name === "AbortError") {
        message = "The audit is taking longer than expected. Please try again in a moment.";
      }
      setSubmitError(message);
      setStep(3);
    } finally {
      setScanning(false);
    }
  }

  const canonical = typeof window !== "undefined" ? `${window.location.origin}/ux-audit` : "https://uxguard.io/ux-audit";

  return (
    <div className="min-h-screen surface-page">
      <DocumentMeta
        title="Free UX Audit | UXGuard Studio"
        description="Discover the UX issues that may be costing your business customers. Get a free UX health check and prioritised roadmap for usability, conversion, accessibility, and performance."
        url={canonical}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />

      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100 surface-section">
        <div className="absolute inset-0 surface-hero-glow" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            <Search className="h-3.5 w-3.5" />
            UXGuard Website Audit
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-ink-950 sm:text-5xl">
            Your website may be getting visitors. But is the experience turning them into customers?
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
            Run a free UX health check to uncover usability, conversion, accessibility, mobile and performance issues that may be affecting customer trust and business growth.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={scrollToAudit}>
              Start My Free Audit
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => coverageRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              See What We Check
            </button>
          </div>

          <form onSubmit={startFromHero} className="mt-10 max-w-xl">
            <label htmlFor="hero-url" className="label-field">Website URL</label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input
                id="hero-url"
                type="url"
                inputMode="url"
                className="input-field flex-1"
                placeholder="https://yourcompany.com"
                value={heroUrl}
                onChange={(e) => { setHeroUrl(e.target.value); setHeroError(""); }}
                aria-invalid={Boolean(heroError)}
                aria-describedby={heroError ? "hero-url-error" : "hero-url-hint"}
              />
              <button type="submit" className="btn-primary shrink-0">Audit My Website</button>
            </div>
            <p id="hero-url-hint" className="mt-2 text-sm text-ink-500">
              We analyse publicly available website signals. No login or technical access required.
            </p>
            {heroError ? (
              <p id="hero-url-error" className="mt-2 text-sm text-red-600" role="alert">{heroError}</p>
            ) : null}
          </form>
          <p className="mt-4 text-sm text-ink-500">Free initial scan · No payment required · Results in minutes</p>
        </div>
      </section>

      {/* Business problem */}
      <section className="border-b border-ink-100 surface-section-alt">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">More traffic cannot fix a confusing customer experience.</h2>
          <p className="mt-4 max-w-3xl text-ink-600">
            Many businesses invest in SEO, advertising, and social media—yet visitors still leave because:
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "The value proposition is unclear",
              "Important actions are difficult to find",
              "Mobile journeys contain friction",
              "Forms are too long or confusing",
              "Pages load slowly",
              "Trust signals are missing",
              "Navigation does not match customer expectations",
              "Accessibility barriers prevent customers from completing tasks",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-ink-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 font-medium text-ink-800">
            UXGuard helps you identify what may be stopping users—and what to improve first.
          </p>
        </div>
      </section>

      {/* Coverage */}
      <section ref={coverageRef} className="border-b border-ink-100 surface-section">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">What we assess</h2>
          <p className="mt-3 max-w-2xl text-ink-600">
            Automated observations are clearly distinguished from areas that benefit from expert human review.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {COVERAGE.map(({ icon: Icon, title, desc, checks }) => (
              <div key={title} className="card p-6">
                <Icon className="h-8 w-8 text-brand-600" aria-hidden />
                <h3 className="mt-4 font-semibold text-ink-900">{title}</h3>
                <p className="mt-2 text-sm text-ink-600">{desc}</p>
                <ul className="mt-4 space-y-1 text-sm text-ink-500">
                  {checks.map((c) => <li key={c}>· {c}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="border-b border-ink-100 surface-section-alt">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">How it works</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { n: "1", title: "Enter your website", desc: "Share the public page you want UXGuard to review." },
              { n: "2", title: "Receive your UX score", desc: "We evaluate key usability, conversion, accessibility, mobile and performance signals." },
              { n: "3", title: "Improve what matters", desc: "Receive prioritised recommendations and choose whether you want expert support." },
            ].map((s) => (
              <li key={s.n} className="relative rounded-2xl border border-ink-100 bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-display text-lg font-bold text-white">{s.n}</span>
                <h3 className="mt-4 font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-600">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Example */}
      <section className="border-b border-ink-100 surface-section">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">See what you will receive</h2>
          <div className="mt-8">
            <ExamplePreview />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b border-ink-100 surface-section-alt">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Built on proven UX practice</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card p-6">
              <Shield className="h-8 w-8 text-brand-600" />
              <h3 className="mt-4 font-semibold text-ink-900">UXGuard methodology</h3>
              <p className="mt-2 text-sm text-ink-600">
                Our framework combines Nielsen usability heuristics, conversion-oriented design principles, Core Web Vitals where available, and WCAG 2.2 AA checks that can be measured from public HTML.
              </p>
            </div>
            <div className="card p-6">
              <BarChart3 className="h-8 w-8 text-brand-600" />
              <h3 className="mt-4 font-semibold text-ink-900">Data privacy</h3>
              <p className="mt-2 text-sm text-ink-600">
                We only fetch publicly available pages for the free scan. Lead details are optional and stored only when you submit the contact form, with separate service and marketing consent.
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-ink-500">
            Case studies and client logos appear on our <Link to="/discover" className="text-brand-600 hover:underline">Discover</Link> page when published.
          </p>
        </div>
      </section>

      {/* Free vs expert */}
      <section className="border-b border-ink-100 surface-section">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Free health check vs expert audit</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="font-semibold text-brand-700">Free UX Health Check</h3>
              <ul className="mt-4 space-y-2 text-sm text-ink-700">
                {["Automated website scan", "UX score", "Category-level results", "Selected priority findings", "Quick-win recommendations", "Summary report"].map((i) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="card border-brand-200 p-6">
              <h3 className="font-semibold text-ink-900">Expert UX Audit</h3>
              <ul className="mt-4 space-y-2 text-sm text-ink-700">
                {["Human heuristic evaluation", "Critical user-flow review", "Analytics review where access is provided", "Competitor comparison", "Conversion-friction analysis", "Prioritised implementation roadmap", "UX consultation", "Optional redesign and implementation support"].map((i) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />{i}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={scrollToAudit}>Start Free Audit</button>
            <Link to="/contact" className="btn-secondary" onClick={() => trackUxAuditEvent("ux_audit_consultation_clicked")}>
              Talk to a UX Specialist
            </Link>
          </div>
        </div>
      </section>

      {/* Audit flow */}
      <section ref={auditRef} id="audit-flow" className="border-b border-ink-100 surface-section-alt">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Start your free audit</h2>
          {step > 0 && step < 4 ? (
            <p className="mt-2 text-sm text-ink-500" aria-live="polite">Step {step} of 3</p>
          ) : null}

          {step === 0 ? (
            <div className="mt-8">
              <button type="button" className="btn-primary" onClick={scrollToAudit}>
                Begin audit wizard <ArrowRight className="ml-2 inline h-4 w-4" />
              </button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="card mt-8 space-y-5 p-6">
              <div>
                <label htmlFor="audit-url" className="label-field">Website URL</label>
                <input id="audit-url" className="input-field" required value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
              </div>
              <div>
                <label htmlFor="page-type" className="label-field">Page type</label>
                <select id="page-type" className="input-field" value={pageType} onChange={(e) => setPageType(e.target.value)}>
                  {PAGE_TYPES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="primary-goal" className="label-field">Primary business goal</label>
                <select id="primary-goal" className="input-field" value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)}>
                  {GOALS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="audience" className="label-field">Primary audience <span className="text-ink-400">(optional)</span></label>
                <input id="audience" className="input-field" value={primaryAudience} onChange={(e) => setPrimaryAudience(e.target.value)} />
              </div>
              <button type="button" className="btn-primary" onClick={() => setStep(2)}>Continue</button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="card mt-8 space-y-5 p-6">
              <div>
                <label htmlFor="company" className="label-field">Company name</label>
                <input id="company" className="input-field" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="industry" className="label-field">Industry</label>
                <input id="industry" className="input-field" value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <div>
                <label htmlFor="concern" className="label-field">Main concern</label>
                <input id="concern" className="input-field" value={mainConcern} onChange={(e) => setMainConcern(e.target.value)} />
              </div>
              <fieldset>
                <legend className="label-field">Select concerns</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CONCERNS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-sm ${selectedConcerns.includes(c) ? "border-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-600"}`}
                      onClick={() => toggleConcern(c)}
                      aria-pressed={selectedConcerns.includes(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="traffic" className="label-field">Monthly traffic <span className="text-ink-400">(optional)</span></label>
                  <input id="traffic" className="input-field" value={monthlyTraffic} onChange={(e) => setMonthlyTraffic(e.target.value)} placeholder="e.g. 10k–50k" />
                </div>
                <div>
                  <label htmlFor="cvr" className="label-field">Conversion rate <span className="text-ink-400">(optional)</span></label>
                  <input id="cvr" className="input-field" value={conversionRate} onChange={(e) => setConversionRate(e.target.value)} placeholder="e.g. 2%" />
                </div>
              </div>
              <div>
                <label htmlFor="target" className="label-field">Target conversion action</label>
                <input id="target" className="input-field" value={targetAction} onChange={(e) => setTargetAction(e.target.value)} />
              </div>
              <div className="sr-only" aria-hidden>
                <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn-primary" onClick={() => { setStep(3); void runScan(); }}>Run audit</button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="card mt-8 p-6" aria-live="polite" aria-busy={scanning}>
              {(() => {
                const progressPercent = scanning
                  ? Math.min(90, Math.round(((scanStage + 1) / SCAN_STAGES.length) * 100))
                  : submitError
                    ? Math.round(((scanStage + 1) / SCAN_STAGES.length) * 100)
                    : 100;
                const statusMessage = scanning
                  ? scanWaitingLong
                    ? "Still analysing your site — larger pages can take up to a minute."
                    : SCAN_STAGES[scanStage]
                  : submitError
                    ? "The scan could not be completed."
                    : "Preparing your audit…";
                return (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <div
                  className="relative flex h-24 w-24 shrink-0 items-center justify-center"
                  role="img"
                  aria-label={scanning ? `Audit in progress: ${SCAN_STAGES[scanStage]}` : "Audit scan"}
                >
                  <svg className="absolute inset-0 -rotate-90 motion-reduce:transition-none" viewBox="0 0 96 96" aria-hidden>
                    <circle cx="48" cy="48" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-ink-100" />
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      fill="none"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - progressPercent / 100)}
                      className="text-brand-500 transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
                    />
                  </svg>
                  {scanning ? (
                    <Loader2 className="relative h-10 w-10 animate-spin text-brand-600 motion-reduce:animate-none" aria-hidden />
                  ) : (
                    <Search className="relative h-9 w-9 text-brand-600" aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h3 className="font-semibold text-ink-900">Scanning your website</h3>
                  <p className="mt-2 text-sm text-ink-600" role="status">
                    {statusMessage}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-ink-500">
                      <span>Progress</span>
                      <span>
                        {scanning
                          ? scanWaitingLong
                            ? "Almost there…"
                            : `Step ${scanStage + 1} of ${SCAN_STAGES.length}`
                          : submitError
                            ? "Stopped"
                            : "Complete"}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`h-full rounded-full bg-brand-500 transition-[width] duration-700 motion-reduce:transition-none ${scanning && scanWaitingLong ? "animate-pulse" : ""}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
                );
              })()}

              <ul className="mt-8 space-y-3 border-t border-ink-100 pt-6">
                {SCAN_STAGES.map((label, i) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    {i < scanStage ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                    ) : i === scanStage && scanning ? (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-600 motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full border-2 border-ink-200" aria-hidden />
                    )}
                    <span className={i <= scanStage && scanning ? "font-medium text-ink-900" : i < scanStage ? "text-ink-700" : "text-ink-400"}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
              {submitError ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                  {submitError}
                  <button type="button" className="mt-3 btn-secondary" onClick={() => { setStep(2); setSubmitError(""); }}>Try again</button>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 && audit ? (
            <div className="mt-8 space-y-8">
              <AuditResultsPanel
                audit={audit}
                leadSlot={
                  <AuditLeadForm
                    accessToken={audit.access_token}
                    defaultCompany={companyName}
                    hasLead={audit.has_lead}
                  />
                }
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/ux-audit/results/${audit.access_token}`)}
              >
                Open full results page
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-ink-100 surface-section">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950">Frequently asked questions</h2>
          <dl className="mt-8 space-y-6">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold text-ink-900">{item.q}</dt>
                <dd className="mt-2 text-sm text-ink-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
