import { useEffect, useState } from "react";
import { FolderKanban } from "lucide-react";
import { api, resolveAssetUrl } from "../../api/client";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import type { Project } from "../../types";

const STATUS_LABELS: Record<Project["status"], string> = {
  planning: "Planning",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export function OurProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .listPublicProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load projects. Please try again shortly.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen surface-page">
      <PublicHeader />

      <section className="border-b border-ink-100 surface-section surface-hero-glow">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">UXGuard Studio</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-950">Our Projects</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Work the UXGuard team is shipping — product initiatives, research programs, and platform
            builds. Member portfolios focus on case studies; these projects are curated by our team.
          </p>
        </div>
      </section>

      <section className="surface-section-alt">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          {error ? (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-72 animate-pulse bg-ink-100" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="card p-12 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-ink-300" />
              <p className="mt-4 text-sm text-ink-500">Projects will appear here soon.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="card overflow-hidden transition hover:border-brand-300 hover:shadow-md"
                >
                  {project.cover_image ? (
                    <img
                      src={resolveAssetUrl(project.cover_image)}
                      alt=""
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-gradient-to-br from-brand-50 to-ink-100">
                      <FolderKanban className="h-10 w-10 text-brand-400" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                        {STATUS_LABELS[project.status] || project.status}
                      </span>
                      {project.client ? (
                        <span className="text-xs text-ink-500">{project.client}</span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 font-display text-xl font-semibold text-ink-950">
                      {project.title}
                    </h2>
                    {project.role ? (
                      <p className="mt-1 text-sm font-medium text-ink-600">{project.role}</p>
                    ) : null}
                    {project.description ? (
                      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink-600">
                        {project.description}
                      </p>
                    ) : null}
                    {project.tags?.length ? (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {project.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {project.outcomes?.length ? (
                      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4">
                        {project.outcomes.slice(0, 4).map((outcome) => (
                          <div key={`${outcome.label}-${outcome.value}`}>
                            <dt className="text-xs uppercase tracking-wide text-ink-400">
                              {outcome.label}
                            </dt>
                            <dd className="mt-0.5 text-sm font-semibold text-ink-900">
                              {outcome.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
