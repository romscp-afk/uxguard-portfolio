const WEAK_VERBS = new Set([
  "helped",
  "assisted",
  "worked",
  "did",
  "made",
  "handled",
  "responsible",
  "involved",
]);

const FIRST_PERSON = /\b(i|me|my|we|our)\b/i;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function issue(severity, code, message, section, field) {
  return { severity, code, message, section: section || null, field: field || null };
}

export function runQualityCheck(resume) {
  const issues = [];
  const basics = resume.basics || {};
  const hidden = new Set(resume.hidden_sections || []);
  const settings = resume.settings || {};
  const templateId = resume.template_id || "classic_ats";

  if (!basics.name) {
    issues.push(issue("critical", "missing_name", "Add your full name.", "basics", "name"));
  }
  if (!basics.email && !basics.phone) {
    issues.push(
      issue("critical", "missing_contact", "Add an email or phone number.", "basics", "email"),
    );
  }
  if (basics.email && !EMAIL_RE.test(basics.email)) {
    issues.push(issue("critical", "invalid_email", "Email format looks invalid.", "basics", "email"));
  }
  if (!hidden.has("summary") && !basics.summary && !basics.objective) {
    issues.push(
      issue("recommended", "missing_summary", "Add a professional summary or objective.", "summary", "summary"),
    );
  }

  for (const urlKey of ["linkedin_url", "portfolio_url", "website_url", "github_url"]) {
    const value = basics[urlKey];
    if (value && !URL_RE.test(value)) {
      issues.push(
        issue("recommended", "invalid_url", `Check the URL format for ${urlKey.replace("_", " ")}.`, "basics", urlKey),
      );
    }
  }

  (resume.experience || []).forEach((exp, index) => {
    if (!exp.start) {
      issues.push(
        issue("recommended", "missing_dates", `Add a start date for “${exp.role || "role"}”.`, "experience", `experience.${index}.start`),
      );
    }
    if (!exp.current && exp.start && exp.end) {
      // Soft date conflict check for year-only values
      const startYear = Number(String(exp.start).match(/(19|20)\d{2}/)?.[0]);
      const endYear = Number(String(exp.end).match(/(19|20)\d{2}/)?.[0]);
      if (startYear && endYear && endYear < startYear) {
        issues.push(
          issue("critical", "date_conflict", `End date is before start date for “${exp.role || "role"}”.`, "experience", `experience.${index}.end`),
        );
      }
    }
    const bullets = (exp.bullets || []).filter(Boolean);
    if (!bullets.length && !exp.description) {
      issues.push(
        issue("recommended", "thin_experience", `Add achievements for “${exp.role || "role"}”.`, "experience", `experience.${index}.bullets`),
      );
    }
    bullets.forEach((bullet, bi) => {
      if (bullet.length > 280) {
        issues.push(
          issue("recommended", "long_paragraph", "A bullet is very long — consider splitting it.", "experience", `experience.${index}.bullets.${bi}`),
        );
      }
      if (FIRST_PERSON.test(bullet)) {
        issues.push(
          issue("recommended", "first_person", "Avoid first-person pronouns in bullets.", "experience", `experience.${index}.bullets.${bi}`),
        );
      }
      const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
      if (WEAK_VERBS.has(firstWord)) {
        issues.push(
          issue("optional", "weak_verb", `Consider a stronger action verb than “${firstWord}”.`, "experience", `experience.${index}.bullets.${bi}`),
        );
      }
      if (!/\d|%|\$|x\b/i.test(bullet)) {
        issues.push(
          issue("optional", "missing_metrics", "Consider adding a measurable outcome where accurate.", "experience", `experience.${index}.bullets.${bi}`),
        );
      }
    });
  });

  const skillNames = (resume.skills || []).map((s) =>
    (typeof s === "string" ? s : s.name || "").trim().toLowerCase(),
  );
  const seen = new Set();
  skillNames.forEach((name) => {
    if (!name) return;
    if (seen.has(name)) {
      issues.push(issue("recommended", "duplicate_skill", `Duplicate skill: “${name}”.`, "skills", "skills"));
    }
    seen.add(name);
  });

  if ((resume.experience || []).length === 0 && !hidden.has("experience")) {
    issues.push(issue("recommended", "no_experience", "Add at least one work experience entry.", "experience", null));
  }

  // Formatting / ATS checks
  if (Number(settings.font_size) > 0 && Number(settings.font_size) < 9.5) {
    issues.push(issue("recommended", "small_font", "Font size is very small and may hurt readability.", "design", "font_size"));
  }
  if (settings.layout === "two" && templateId === "classic_ats") {
    issues.push(
      issue("critical", "ats_columns", "Classic ATS should stay single-column for parsing reliability.", "design", "layout"),
    );
  }
  if (settings.show_photo) {
    issues.push(
      issue("optional", "photo_ats", "Profile photos can confuse some ATS parsers — hide for ATS submissions.", "design", "show_photo"),
    );
  }
  if (!["classic_ats", "executive_minimal", "modern_professional"].includes(templateId)) {
    issues.push(issue("optional", "unknown_template", "Unknown template — verify headings remain standard.", "design", "template_id"));
  }

  const critical = issues.filter((i) => i.severity === "critical").length;
  const recommended = issues.filter((i) => i.severity === "recommended").length;
  const optional = issues.filter((i) => i.severity === "optional").length;

  // Deduplicate near-identical optional metric warnings (keep first 5)
  const filtered = [];
  let metricCount = 0;
  for (const item of issues) {
    if (item.code === "missing_metrics") {
      metricCount += 1;
      if (metricCount > 5) continue;
    }
    filtered.push(item);
  }

  return {
    issues: filtered,
    summary: {
      critical,
      recommended,
      optional,
      total: filtered.length,
    },
    guidance:
      "This is a quality guidance check, not a guarantee of hiring-system or ATS performance.",
  };
}
