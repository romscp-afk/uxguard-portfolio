import { Link } from "react-router-dom";
import { ArrowRight, Mail, MessageCircle, Sparkles, Wand2 } from "lucide-react";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "../../lib/contact";

const INQUIRY_TYPES = [
  {
    icon: Wand2,
    title: "Case study & portfolio services",
    desc: "We'll build your case studies, portfolios, and professional narratives for you.",
  },
  {
    icon: MessageCircle,
    title: "UX & product consulting",
    desc: "Research, audits, strategy, journey mapping, and design reviews.",
  },
  {
    icon: Sparkles,
    title: "Platform & community",
    desc: "Accounts, publishing, partnerships, and general questions about UXGuard Studio.",
  },
] as const;

export function ContactPage() {
  return (
    <div className="min-h-screen surface-page">
      <PublicHeader />

      <section className="relative overflow-hidden border-b border-ink-100 dark:border-ink-800 surface-section">
        <div className="absolute inset-0 surface-hero-glow" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
            <Mail className="h-3.5 w-3.5" />
            Contact UXGuard Studio
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-ink-950 dark:text-white sm:text-5xl">
            Let&apos;s build your{" "}
            <span className="text-brand-600 dark:text-brand-400">professional legacy</span> together.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            Whether you need a case study written for you, UX research support, or help getting started on
            the platform—we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="border-b border-ink-100 dark:border-ink-800 surface-section-alt">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 dark:border-brand-800 dark:from-brand-950/40 dark:to-ink-900 lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                Email us
              </p>
              <a
                href={CONTACT_MAILTO}
                className="mt-4 block break-all font-display text-2xl font-bold text-ink-950 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-400 sm:text-3xl"
              >
                {CONTACT_EMAIL}
              </a>
              <p className="mt-4 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                Send us a message and we&apos;ll get back to you as soon as we can. Include your name, role,
                and what you&apos;re looking for—we respond to every inquiry.
              </p>
              <a href={CONTACT_MAILTO} className="btn-primary mt-8 inline-flex">
                Send an email
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="lg:col-span-7">
              <h2 className="font-display text-2xl font-bold text-ink-950 dark:text-white">
                How can we help?
              </h2>
              <div className="mt-6 space-y-4">
                {INQUIRY_TYPES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="card flex gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/50">
                      <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-ink-100">{title}</p>
                      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">We&apos;ll work for you.</h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-400">
            Short on time? Our team can create case studies and portfolios that showcase your impact—ready
            to share with recruiters and clients.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={CONTACT_MAILTO}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-8 py-3.5 font-semibold text-white transition hover:bg-brand-400"
            >
              Get in touch
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-lg border border-ink-600 px-8 py-3.5 font-semibold text-ink-200 transition hover:border-brand-500 hover:text-white"
            >
              About UXGuard Studio
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
