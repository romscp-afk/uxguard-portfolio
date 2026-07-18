import type { ReactNode } from "react";
import type { Resume, ResumeSettings } from "../../types";

const FONT_CLASS: Record<string, string> = {
  Helvetica: "font-sans",
  "Times-Roman": "font-serif",
  Courier: "font-mono",
};

function skillNames(resume: Resume) {
  return (resume.skills || []).map((s) => s.name).filter(Boolean).join(" · ");
}

function dateRange(start?: string, end?: string, current?: boolean) {
  const a = start || "";
  const b = current ? "Present" : end || "";
  if (!a && !b) return "";
  return `${a}${a || b ? " – " : ""}${b}`;
}

export function ResumeDocument({
  resume,
  zoom = 1,
}: {
  resume: Resume;
  zoom?: number;
}) {
  const settings: ResumeSettings = {
    primary_color: "#111827",
    accent_color: "#111827",
    font_family: "Helvetica",
    font_size: 11,
    line_spacing: 1.15,
    section_spacing: 10,
    margins: 54,
    layout: "single",
    show_photo: false,
    date_format: "mmm_yyyy",
    page_size: "a4",
    ...(resume.settings || {}),
  };
  const templateId = resume.template_id || "classic_ats";
  const hidden = new Set(resume.hidden_sections || []);
  const pageClass =
    settings.page_size === "letter" ? "aspect-[8.5/11]" : "aspect-[210/297]";
  const isModern = templateId === "modern_professional";
  const isExecutive = templateId === "executive_minimal";

  return (
    <div
      className="mx-auto w-full max-w-[640px] origin-top bg-white shadow-md ring-1 ring-ink-100"
      style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
    >
      <article
        className={`${pageClass} w-full overflow-hidden text-ink-900 ${FONT_CLASS[settings.font_family] || "font-sans"}`}
        style={{
          fontSize: `${settings.font_size}pt`,
          lineHeight: settings.line_spacing,
          padding: isModern ? 0 : `${settings.margins / 4}px`,
        }}
      >
        {isModern ? (
          <header
            className="px-8 py-5 text-white"
            style={{ backgroundColor: settings.primary_color }}
          >
            <h1 className="text-[1.6em] font-bold leading-tight">
              {resume.basics.name || "Your Name"}
            </h1>
            <p className="mt-1 opacity-90">
              {resume.basics.title || resume.target_role || ""}
            </p>
          </header>
        ) : (
          <header className={isModern ? "" : "px-2 pt-2"}>
            <h1
              className="text-[1.55em] font-bold leading-tight"
              style={{ color: settings.primary_color }}
            >
              {resume.basics.name || "Your Name"}
            </h1>
            <p style={{ color: settings.accent_color }}>
              {resume.basics.title || resume.target_role || ""}
            </p>
          </header>
        )}

        <div className={isModern ? "px-8 py-5" : "px-2 pb-4"}>
          <p className="text-[0.85em] text-ink-500">
            {[
              resume.basics.email,
              resume.basics.phone,
              resume.basics.city || resume.basics.location,
              resume.basics.linkedin_url,
              resume.basics.portfolio_url || resume.basics.website_url,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {(resume.basics.summary || resume.basics.objective) && !hidden.has("summary") ? (
            <Section title="Summary" settings={settings} executive={isExecutive}>
              <p className="whitespace-pre-wrap">
                {resume.basics.summary || resume.basics.objective}
              </p>
            </Section>
          ) : null}

          {resume.experience.length > 0 && !hidden.has("experience") ? (
            <Section title="Experience" settings={settings} executive={isExecutive}>
              <ul className="space-y-3">
                {resume.experience.map((item) => (
                  <li key={item.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">{item.role || "Role"}</p>
                      <p className="text-[0.85em] text-ink-500">
                        {dateRange(item.start, item.end, item.current)}
                      </p>
                    </div>
                    <p className="text-ink-600">
                      {[item.company, item.location].filter(Boolean).join(" · ")}
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {(item.bullets || []).filter(Boolean).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {resume.education.length > 0 && !hidden.has("education") ? (
            <Section title="Education" settings={settings} executive={isExecutive}>
              <ul className="space-y-2">
                {resume.education.map((item) => (
                  <li key={item.id}>
                    <p className="font-semibold">{item.school || "Institution"}</p>
                    <p className="text-ink-600">
                      {[item.degree, item.field, dateRange(item.start, item.end, item.current)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {(resume.skills || []).length > 0 && !hidden.has("skills") ? (
            <Section title="Skills" settings={settings} executive={isExecutive}>
              <p>{skillNames(resume)}</p>
            </Section>
          ) : null}

          {resume.projects.length > 0 && !hidden.has("projects") ? (
            <Section title="Projects" settings={settings} executive={isExecutive}>
              <ul className="space-y-2">
                {resume.projects.map((item) => (
                  <li key={item.id}>
                    <p className="font-semibold">{item.name || "Project"}</p>
                    {item.summary ? <p className="text-ink-600">{item.summary}</p> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {resume.certifications.length > 0 && !hidden.has("certifications") ? (
            <Section title="Certifications" settings={settings} executive={isExecutive}>
              <ul className="space-y-1">
                {resume.certifications.map((item) => (
                  <li key={item.id}>
                    {[item.name, item.issuer, item.year || item.issue_date]
                      .filter(Boolean)
                      .join(" · ")}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {(resume.languages || []).length > 0 && !hidden.has("languages") ? (
            <Section title="Languages" settings={settings} executive={isExecutive}>
              <p>
                {(resume.languages || [])
                  .map((l) => [l.language, l.proficiency].filter(Boolean).join(" — "))
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </Section>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function Section({
  title,
  settings,
  executive,
  children,
}: {
  title: string;
  settings: ResumeSettings;
  executive?: boolean;
  children: ReactNode;
}) {
  return (
    <section style={{ marginTop: settings.section_spacing }}>
      <h2
        className="mb-1 text-[0.95em] font-bold uppercase tracking-wide"
        style={{
          color: settings.primary_color,
          borderBottom: executive ? undefined : `1px solid ${settings.accent_color}`,
          paddingBottom: executive ? 0 : 2,
          letterSpacing: executive ? "0.08em" : undefined,
        }}
      >
        {title}
      </h2>
      <div className="text-[0.95em] text-ink-800">{children}</div>
    </section>
  );
}
