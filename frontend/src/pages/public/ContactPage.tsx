import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, Mail, MessageCircle, Send, Sparkles } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";

const INQUIRY_OPTIONS = [
  "Case study & portfolio",
  "UX & product consulting",
  "Platform & community",
  "Partnership",
  "Other",
] as const;

const INQUIRY_TYPES = [
  {
    icon: MessageCircle,
    title: "Case study & portfolio",
    desc: "Help documenting your projects, impact, and professional narrative.",
  },
  {
    icon: Sparkles,
    title: "UX & product consulting",
    desc: "Research, audits, strategy, journey mapping, and design reviews.",
  },
  {
    icon: Mail,
    title: "Platform & community",
    desc: "Accounts, publishing, partnerships, and general questions.",
  },
] as const;

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inquiryType, setInquiryType] = useState<string>(INQUIRY_OPTIONS[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const result = await api.submitContact({
        name,
        email,
        inquiryType,
        subject,
        message,
        uxg_hp: website,
      });
      setSuccess(true);
      setName("");
      setEmail("");
      setInquiryType(INQUIRY_OPTIONS[0]);
      setSubject("");
      setMessage("");
      setWebsite("");
      if (result.message) {
        // message shown via success UI
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not send your message. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen surface-page">
      <PublicHeader />

      <section className="relative overflow-hidden border-b border-ink-100 surface-section">
        <div className="absolute inset-0 surface-hero-glow" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
            <Mail className="h-3.5 w-3.5" />
            Contact UXGuard Studio
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-ink-950 sm:text-5xl">
            Let&apos;s build your{" "}
            <span className="text-brand-600">professional legacy</span> together.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
            Send us a message using the form below—we&apos;ll receive it directly and get back to you
            as soon as we can.
          </p>
        </div>
      </section>

      <section className="border-b border-ink-100 surface-section-alt">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-12">
            <form onSubmit={handleSubmit} className="card p-8 lg:col-span-7">
              <h2 className="font-display text-2xl font-bold text-ink-950">Send a message</h2>
              <p className="mt-2 text-sm text-ink-500">
                Your message is sent securely—no email app required.
              </p>

              {success ? (
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p>Thanks for reaching out. Your message was saved to our Contact Inbox—we&apos;ll reply soon.</p>
                </div>
              ) : null}

              {error ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              ) : null}

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="label-field">
                    Your name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    placeholder="Jane Doe"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="label-field">
                    Your email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@company.com"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="contact-type" className="label-field">
                  Inquiry type
                </label>
                <select
                  id="contact-type"
                  value={inquiryType}
                  onChange={(e) => setInquiryType(e.target.value)}
                  className="input-field"
                  disabled={submitting}
                >
                  {INQUIRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <label htmlFor="contact-subject" className="label-field">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input-field"
                  placeholder="How can we help?"
                  disabled={submitting}
                />
              </div>

              <div className="mt-5">
                <label htmlFor="contact-message" className="label-field">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input-field resize-y"
                  placeholder="Tell us about your project, goals, or question..."
                  disabled={submitting}
                />
              </div>

              <input
                type="text"
                name="uxg_hp"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary mt-8 w-full disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send message
                  </>
                )}
              </button>
            </form>

            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl font-bold text-ink-950">How can we help?</h2>
              <div className="mt-6 space-y-4">
                {INQUIRY_TYPES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="card flex gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                      <Icon className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900">{title}</p>
                      <p className="mt-1 text-sm text-ink-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/about"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-500"
              >
                Learn about UXGuard Studio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
