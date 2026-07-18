import { normalizeResumeSettings } from "./templates.js";

function uid(prefix = "r") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const RESUME_STATUSES = ["draft", "completed", "archived", "deleted"];
export const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "executive", "career_change"];
export const CREATION_METHODS = ["manual", "upload"];

export function emptyResumeBasics() {
  return {
    name: "",
    title: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    address: "",
    postal_code: "",
    location: "",
    linkedin_url: "",
    portfolio_url: "",
    website_url: "",
    github_url: "",
    photo_url: "",
    summary: "",
    objective: "",
    links: [],
  };
}

export function emptyResumeBody() {
  return {
    basics: emptyResumeBasics(),
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    publications: [],
    volunteering: [],
    references: [],
    custom_sections: [],
    section_order: [
      "basics",
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
      "certifications",
      "languages",
      "awards",
      "publications",
      "volunteering",
      "references",
      "custom",
    ],
    hidden_sections: [],
  };
}

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function normalizeLinks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      label: asString(item?.label) || "Link",
      url: asString(item?.url),
    }))
    .filter((item) => item.url);
}

function normalizeSkills(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const name = asString(item);
        return name ? { id: uid("skill"), name, category: "Other", level: "", years: "" } : null;
      }
      const name = asString(item?.name);
      if (!name) return null;
      return {
        id: asString(item?.id) || uid("skill"),
        name,
        category: asString(item?.category) || "Other",
        level: asString(item?.level),
        years: asString(item?.years),
      };
    })
    .filter(Boolean);
}

function normalizeExperience(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("exp"),
    company: asString(item?.company),
    role: asString(item?.role),
    employment_type: asString(item?.employment_type),
    location: asString(item?.location),
    work_mode: asString(item?.work_mode),
    start: asString(item?.start),
    end: asString(item?.end),
    current: Boolean(item?.current),
    description: asString(item?.description),
    bullets: asStringArray(item?.bullets),
    tools: asStringArray(item?.tools),
  }));
}

function normalizeEducation(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("edu"),
    school: asString(item?.school),
    degree: asString(item?.degree),
    field: asString(item?.field),
    location: asString(item?.location),
    start: asString(item?.start),
    end: asString(item?.end),
    current: Boolean(item?.current),
    grade: asString(item?.grade),
    details: asString(item?.details),
  }));
}

function normalizeCertifications(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("cert"),
    name: asString(item?.name),
    issuer: asString(item?.issuer),
    year: asString(item?.year) || asString(item?.issue_date),
    issue_date: asString(item?.issue_date) || asString(item?.year),
    expiration_date: asString(item?.expiration_date),
    credential_id: asString(item?.credential_id),
    credential_url: asString(item?.credential_url),
    no_expiry: Boolean(item?.no_expiry),
  }));
}

function normalizeProjects(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("proj"),
    name: asString(item?.name),
    role: asString(item?.role),
    organization: asString(item?.organization),
    url: asString(item?.url),
    start: asString(item?.start),
    end: asString(item?.end),
    summary: asString(item?.summary),
    outcomes: asStringArray(item?.outcomes),
    tools: asStringArray(item?.tools),
  }));
}

function normalizeLanguages(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("lang"),
    language: asString(item?.language),
    proficiency: asString(item?.proficiency),
  }));
}

function normalizeSimpleEntries(value, prefix) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid(prefix),
    title: asString(item?.title || item?.name),
    issuer: asString(item?.issuer || item?.publisher || item?.organization),
    date: asString(item?.date || item?.year),
    url: asString(item?.url),
    description: asString(item?.description || item?.details),
  }));
}

function normalizeReferences(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("ref"),
    name: asString(item?.name),
    position: asString(item?.position),
    company: asString(item?.company),
    email: asString(item?.email),
    phone: asString(item?.phone),
    relationship: asString(item?.relationship),
  }));
}

function normalizeCustomSections(value) {
  if (!Array.isArray(value)) return [];
  return value.map((section) => ({
    id: asString(section?.id) || uid("csec"),
    title: asString(section?.title) || "Custom section",
    items: Array.isArray(section?.items)
      ? section.items.map((item) => ({
          id: asString(item?.id) || uid("citem"),
          title: asString(item?.title),
          subtitle: asString(item?.subtitle),
          date: asString(item?.date),
          description: asString(item?.description),
          url: asString(item?.url),
        }))
      : [],
  }));
}

/** Completion weights from product spec (approx). */
export function calculateCompletion(resume) {
  const hidden = new Set(resume.hidden_sections || []);
  const weights = {
    basics: 15,
    summary: 10,
    experience: 25,
    education: 15,
    skills: 15,
    other: 20,
  };

  let earned = 0;
  let total = 0;

  const hasBasics =
    Boolean(resume.basics?.name) &&
    (Boolean(resume.basics?.email) || Boolean(resume.basics?.phone));
  if (!hidden.has("basics")) {
    total += weights.basics;
    if (hasBasics) earned += weights.basics;
  }

  const hasSummary = Boolean(resume.basics?.summary || resume.basics?.objective);
  if (!hidden.has("summary")) {
    total += weights.summary;
    if (hasSummary) earned += weights.summary;
  }

  if (!hidden.has("experience")) {
    total += weights.experience;
    if ((resume.experience || []).length > 0) earned += weights.experience;
  }

  if (!hidden.has("education")) {
    total += weights.education;
    if ((resume.education || []).length > 0) earned += weights.education;
  }

  if (!hidden.has("skills")) {
    total += weights.skills;
    if ((resume.skills || []).length > 0) earned += weights.skills;
  }

  const otherFilled =
    (resume.projects || []).length > 0 ||
    (resume.certifications || []).length > 0 ||
    (resume.languages || []).length > 0 ||
    (resume.awards || []).length > 0 ||
    (resume.publications || []).length > 0 ||
    (resume.volunteering || []).length > 0 ||
    (resume.custom_sections || []).length > 0;
  total += weights.other;
  if (otherFilled) earned += weights.other;

  if (total <= 0) return 0;
  return Math.round((earned / total) * 100);
}

export function createBlankResume(userId, overrides = {}) {
  const now = new Date().toISOString();
  const body = emptyResumeBody();
  return normalizeResume(
    {
      id: 0,
      user_id: Number(userId),
      title: overrides.title || "My Resume",
      target_role: overrides.target_role || "",
      target_company: overrides.target_company || "",
      target_industry: overrides.target_industry || "",
      target_country: overrides.target_country || "",
      experience_level: overrides.experience_level || "mid",
      creation_method: overrides.creation_method || "manual",
      status: "draft",
      template_id: "classic_ats",
      settings: {},
      ...body,
      ...overrides,
      basics: { ...body.basics, ...(overrides.basics || {}) },
      created_at: overrides.created_at || now,
      updated_at: now,
      deleted_at: null,
    },
    userId,
  );
}

export function normalizeResume(input, userId) {
  const raw = input && typeof input === "object" ? input : {};
  const uidNum = Number(userId);
  const now = new Date().toISOString();
  const status = RESUME_STATUSES.includes(raw.status) ? raw.status : "draft";
  const experienceLevel = EXPERIENCE_LEVELS.includes(raw.experience_level)
    ? raw.experience_level
    : "mid";
  const creationMethod = CREATION_METHODS.includes(raw.creation_method)
    ? raw.creation_method
    : "manual";

  // Migrate legacy string[] skills
  const skills = normalizeSkills(raw.skills);

  const resume = {
    id: Number(raw.id) || 0,
    user_id: uidNum,
    title: asString(raw.title) || "My Resume",
    target_role: asString(raw.target_role),
    target_company: asString(raw.target_company),
    target_industry: asString(raw.target_industry),
    target_country: asString(raw.target_country),
    experience_level: experienceLevel,
    creation_method: creationMethod,
    status,
    template_id: asString(raw.template_id) || "classic_ats",
    settings: normalizeResumeSettings(raw.settings, asString(raw.template_id) || "classic_ats"),
    versions: normalizeVersions(raw.versions),
    basics: {
      ...emptyResumeBasics(),
      name: asString(raw.basics?.name),
      title: asString(raw.basics?.title),
      email: asString(raw.basics?.email),
      phone: asString(raw.basics?.phone),
      country: asString(raw.basics?.country),
      city: asString(raw.basics?.city),
      address: asString(raw.basics?.address),
      postal_code: asString(raw.basics?.postal_code),
      location:
        asString(raw.basics?.location) ||
        [asString(raw.basics?.city), asString(raw.basics?.country)].filter(Boolean).join(", "),
      linkedin_url: asString(raw.basics?.linkedin_url),
      portfolio_url: asString(raw.basics?.portfolio_url),
      website_url: asString(raw.basics?.website_url),
      github_url: asString(raw.basics?.github_url),
      photo_url: asString(raw.basics?.photo_url),
      summary: asString(raw.basics?.summary),
      objective: asString(raw.basics?.objective),
      links: normalizeLinks(raw.basics?.links),
    },
    experience: normalizeExperience(raw.experience),
    education: normalizeEducation(raw.education),
    skills,
    projects: normalizeProjects(raw.projects),
    certifications: normalizeCertifications(raw.certifications),
    languages: normalizeLanguages(raw.languages),
    awards: normalizeSimpleEntries(raw.awards, "award"),
    publications: normalizeSimpleEntries(raw.publications, "pub"),
    volunteering: normalizeSimpleEntries(raw.volunteering, "vol"),
    references: normalizeReferences(raw.references),
    custom_sections: normalizeCustomSections(raw.custom_sections),
    section_order: asStringArray(raw.section_order).length
      ? asStringArray(raw.section_order)
      : emptyResumeBody().section_order,
    hidden_sections: asStringArray(raw.hidden_sections),
    source_media_id:
      raw.source_media_id == null || raw.source_media_id === ""
        ? null
        : Number(raw.source_media_id),
    source_filename: raw.source_filename ? asString(raw.source_filename) : null,
    source_mime: raw.source_mime ? asString(raw.source_mime) : null,
    parsed_at: raw.parsed_at || null,
    parse_status: ["none", "pending", "ready", "failed"].includes(raw.parse_status)
      ? raw.parse_status
      : "none",
    parse_error: raw.parse_error ? asString(raw.parse_error) : null,
    extraction: normalizeExtraction(raw.extraction),
    timeline_selections: Array.isArray(raw.timeline_selections)
      ? raw.timeline_selections.map((item) => {
          const content =
            item?.resume_specific_content && typeof item.resume_specific_content === "object"
              ? {
                  title: asString(item.resume_specific_content.title),
                  description: asString(item.resume_specific_content.description),
                  achievements: asStringArray(item.resume_specific_content.achievements),
                  skills: asStringArray(item.resume_specific_content.skills),
                }
              : null;
          return {
            id: asString(item?.id) || uid("sel"),
            timeline_entry_id: Number(item?.timeline_entry_id) || 0,
            is_included: item?.is_included !== false,
            resume_specific_content: content,
            created_at: item?.created_at || now,
            updated_at: item?.updated_at || now,
          };
        }).filter((item) => item.timeline_entry_id)
      : [],
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
    deleted_at: raw.deleted_at || null,
  };

  resume.completion_percentage = calculateCompletion(resume);
  return resume;
}

function normalizeVersions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => ({
    id: asString(item?.id) || uid("ver"),
    version_number: Number(item?.version_number) || index + 1,
    label: asString(item?.label) || `Version ${index + 1}`,
    notes: asString(item?.notes),
    target_company: asString(item?.target_company),
    target_role: asString(item?.target_role),
    content_snapshot: item?.content_snapshot && typeof item.content_snapshot === "object"
      ? item.content_snapshot
      : {},
    created_at: item?.created_at || new Date().toISOString(),
    created_by: item?.created_by == null ? null : Number(item.created_by),
  }));
}

function normalizeExtraction(raw) {
  if (!raw || typeof raw !== "object") return null;
  const status = ["pending_review", "confirmed", "failed", "skipped"].includes(raw.status)
    ? raw.status
    : "pending_review";
  return {
    parser_version: asString(raw.parser_version) || "1.0.0",
    parser: asString(raw.parser) || "unknown",
    ai_used: Boolean(raw.ai_used),
    status,
    raw_text: asString(raw.raw_text).slice(0, 80_000),
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    fields: raw.fields && typeof raw.fields === "object" ? raw.fields : {},
    needs_review_count: Number(raw.needs_review_count) || 0,
    created_at: raw.created_at || null,
    reviewed_at: raw.reviewed_at || null,
  };
}

export function mergeParsedIntoResume(existing, parsed) {
  return normalizeResume(
    {
      ...existing,
      basics: { ...existing.basics, ...(parsed.basics || {}) },
      experience: Array.isArray(parsed.experience) ? parsed.experience : existing.experience,
      education: Array.isArray(parsed.education) ? parsed.education : existing.education,
      skills: Array.isArray(parsed.skills) ? parsed.skills : existing.skills,
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications
        : existing.certifications,
      projects: Array.isArray(parsed.projects) ? parsed.projects : existing.projects,
      languages: Array.isArray(parsed.languages) ? parsed.languages : existing.languages,
      awards: Array.isArray(parsed.awards) ? parsed.awards : existing.awards,
    },
    existing.user_id,
  );
}

export function toResumeSummary(resume) {
  return {
    id: resume.id,
    title: resume.title,
    target_role: resume.target_role,
    status: resume.status,
    completion_percentage: resume.completion_percentage,
    template_id: resume.template_id,
    creation_method: resume.creation_method,
    updated_at: resume.updated_at,
    created_at: resume.created_at,
  };
}

export { uid };
