import { Link } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { resolveAssetUrl } from "../../api/client";
import { ContentBlockRenderer } from "../../components/case-study/ContentBlockRenderer";
import { RichText } from "../ui/RichText";
import type { CaseStudy, UserProfile } from "../../types";

function Section({ title, children }: { title: string; children?: string | null }) {
  if (!children?.trim()) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-semibold text-ink-900">{title}</h2>
      <RichText text={children} />
    </section>
  );
}

type Props = {
  study: CaseStudy;
  author?: UserProfile | null;
  username?: string;
  preview?: boolean;
  backHref?: string;
  backLabel?: string;
};

export function CaseStudyArticle({
  study,
  author,
  username,
  preview = false,
  backHref,
  backLabel,
}: Props) {
  const profileUsername = username || author?.username;
  const backTo = backHref || (profileUsername ? `/u/${profileUsername}` : "/");
  const backText = backLabel || (author?.name ? `${author.name}'s portfolio` : "Back");

  return (
    <>
      {preview ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          Preview mode — this case study is not published yet. Only you can see this page.
        </div>
      ) : null}

      {study.cover_image ? (
        <div className="aspect-[21/9] max-h-[480px] w-full overflow-hidden bg-ink-100">
          <img src={resolveAssetUrl(study.cover_image)} alt={study.title} className="h-full w-full object-cover" />
        </div>
      ) : null}

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          to={backTo}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {backText}
        </Link>

        <header className="space-y-4 border-b border-ink-100 pb-10">
          <div className="flex flex-wrap gap-2">
            {study.client ? (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {study.client}
              </span>
            ) : null}
            {study.project_type ? (
              <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
                {study.project_type}
              </span>
            ) : null}
            {preview ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Draft preview
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-4xl font-bold text-ink-950 sm:text-5xl">{study.title}</h1>
          {study.subtitle ? <p className="text-xl text-ink-500">{study.subtitle}</p> : null}

          <dl className="grid gap-4 pt-4 sm:grid-cols-3">
            {study.role ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">Role</dt>
                <dd className="mt-1 font-medium text-ink-800">{study.role}</dd>
              </div>
            ) : null}
            {study.duration ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">Duration</dt>
                <dd className="mt-1 font-medium text-ink-800">{study.duration}</dd>
              </div>
            ) : null}
            {study.methods.length > 0 ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">Methods</dt>
                <dd className="mt-1 font-medium text-ink-800">{study.methods.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        {study.summary ? (
          <p className="mt-10 text-lg leading-relaxed text-ink-700">{study.summary}</p>
        ) : null}

        {study.metrics.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {study.metrics.map((m) => (
              <div key={m.label} className="card p-5 text-center">
                <p className="font-display text-3xl font-bold text-brand-600">{m.value}</p>
                <p className="mt-1 font-semibold text-ink-900">{m.label}</p>
                {m.description ? <p className="mt-1 text-xs text-ink-500">{m.description}</p> : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-14 space-y-12">
          <Section title="The Challenge">{study.challenge}</Section>
          <Section title="Methodology">{study.methodology}</Section>
          <ContentBlockRenderer blocks={study.content_blocks} />
          <Section title="Impact">{study.impact}</Section>
          <Section title="Reflections">{study.reflections}</Section>
        </div>

        {study.attachments && study.attachments.length > 0 ? (
          <section className="mt-14 border-t border-ink-100 pt-10">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Research Reports</h2>
            <div className="mt-4 space-y-3">
              {study.attachments.map((att) => (
                <a
                  key={att.id}
                  href={resolveAssetUrl(att.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-brand-600" />
                    <div>
                      <p className="font-medium text-ink-900">{att.title}</p>
                      <p className="text-xs uppercase text-ink-400">{att.file_type}</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-ink-400" />
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </>
  );
}
