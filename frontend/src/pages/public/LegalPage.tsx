import { Link } from "react-router-dom";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";

type LegalKind = "privacy" | "terms";

const COPY: Record<
  LegalKind,
  { title: string; updated: string; sections: { heading: string; body: string }[] }
> = {
  privacy: {
    title: "Privacy Policy",
    updated: "August 2026",
    sections: [
      {
        heading: "Who we are",
        body: "UXGuard Studio (uxguard.studio) and the UXGuard Studio mobile app provide professional portfolio and UX learning tools. Contact: hello@uxguard.studio.",
      },
      {
        heading: "Account data we collect",
        body: "If you create an account: name, email, username, profile photo/cover, title, bio, location, contact email, LinkedIn URL, CV URL, interests, and experience level. Website accounts and mobile accounts are separate until identity is unified.",
      },
      {
        heading: "Content and learning data",
        body: "Portfolio content you publish (case studies, articles where available), drafts, uploaded media, bookmarks, reading progress, challenge attempts and answers, UXGuard Points balance and history, and reward redemptions.",
      },
      {
        heading: "Device and notification data",
        body: "If you allow notifications in the mobile app, we may store a device push token so we can send learning or product messages. Push sending remains disabled until credentials and legal copy are confirmed. We also collect basic technical logs needed to operate and secure the service.",
      },
      {
        heading: "Sponsored / partner content",
        body: "Sponsored cards may record impressions, opens, and outbound clicks so we can operate partner placements. Those events never award UXGuard Points.",
      },
      {
        heading: "How we use data",
        body: "To provide your workspace, publish public profiles and case studies, personalise learning features, run challenges and rewards, improve UXGuard Studio, prevent abuse, and communicate about your account. We do not sell personal data.",
      },
      {
        heading: "Retention and deletion",
        body: "You can delete the mobile account in Profile → Settings → Delete account. That removes mobile learning data and the mobile auth user when the delete-account function is deployed. It does not automatically delete a separate website portfolio. Website account deletion or content removal can be requested at hello@uxguard.studio.",
      },
      {
        heading: "Sharing",
        body: "We use infrastructure providers (for example hosting, database, and email) to run the product. Public profiles and published case studies are visible to visitors. We share data only as needed to operate the service, comply with law, or protect the platform.",
      },
      {
        heading: "Contact",
        body: "Privacy questions: hello@uxguard.studio",
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "August 2026",
    sections: [
      {
        heading: "Using UXGuard Studio",
        body: "You may use the website and mobile app to create, browse, and publish professional portfolio and learning content. Guest browsing shows published studio content. An account is required for challenges, points, rewards, and authoring. You are responsible for the accuracy and legality of content you upload.",
      },
      {
        heading: "Accounts",
        body: "Mobile accounts are separate from website accounts until identity is unified. Keep your credentials secure. We may suspend accounts that abuse the service, infringe others’ rights, or attempt to manipulate points or rewards.",
      },
      {
        heading: "UXGuard Points",
        body: "Points are a promotional balance inside the app. They are not money, have no cash value, cannot be withdrawn or transferred, and are never awarded for viewing or clicking ads. Redemptions may stay pending until the studio team fulfils them.",
      },
      {
        heading: "Accounts & plans",
        body: "Free and paid website plans are offered as described on the Pricing page. Paid access continues through the purchased billing period unless otherwise stated.",
      },
      {
        heading: "Intellectual property",
        body: "You retain rights to content you create. By publishing, you grant UXGuard Studio a licence to host and display that content as part of the service. Our name, branding, and product materials remain ours.",
      },
      {
        heading: "Contact",
        body: "Questions about these terms: hello@uxguard.studio",
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
