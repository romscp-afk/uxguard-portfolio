import { Link } from "react-router-dom";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";

type LegalKind = "privacy" | "terms";

const COPY: Record<
  LegalKind,
  { title: string; updated: string; sections: { heading: string; body: string }[] }
> = {
  privacy: {
    title: "Privacy Policy",
    updated: "July 2026",
    sections: [
      {
        heading: "What we collect",
        body: "Account details you provide (name, email, username), portfolio content you publish, and basic usage data needed to operate the service.",
      },
      {
        heading: "How we use it",
        body: "To provide your workspace, publish public profiles and case studies, improve UXGuard Studio, and communicate about your account.",
      },
      {
        heading: "Contact",
        body: "Questions about privacy: uxguardstudio@gmail.com",
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "July 2026",
    sections: [
      {
        heading: "Using UXGuard Studio",
        body: "You may use the platform to create and publish professional portfolio content. You are responsible for the accuracy and legality of content you upload.",
      },
      {
        heading: "Accounts & plans",
        body: "Free and paid plans are offered as described on the Pricing page. Paid access continues through the purchased billing period unless otherwise stated.",
      },
      {
        heading: "Contact",
        body: "Questions about these terms: uxguardstudio@gmail.com",
      },
    ],
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const page = COPY[kind];
  return (
    <div className="min-h-screen surface-page">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ink-950">{page.title}</h1>
        <p className="mt-2 text-sm text-ink-500">Last updated {page.updated}</p>
        <div className="mt-10 space-y-8">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-bold text-ink-900">{section.heading}</h2>
              <p className="mt-2 leading-relaxed text-ink-600">{section.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm text-ink-500">
          Prefer a human?{" "}
          <Link to="/contact" className="font-medium text-brand-600 hover:text-brand-500">
            Contact us
          </Link>
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
