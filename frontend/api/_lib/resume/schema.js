function uid(prefix = "r") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyResumeBasics() {
  return {
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    links: [],
  };
}

export function emptyResumeBody() {
  return {
    basics: emptyResumeBasics(),
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
  };
}

export function createBlankResume(userId, overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: overrides.id || 0,
    user_id: Number(userId),
    title: overrides.title || "My Resume",
    ...emptyResumeBody(),
    source_media_id: null,
    source_filename: null,
    source_mime: null,
    parsed_at: null,
    parse_status: "none",
    parse_error: null,
    created_at: overrides.created_at || now,
    updated_at: now,
    ...overrides,
    basics: { ...emptyResumeBasics(), ...(overrides.basics || {}) },
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

function normalizeExperience(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("exp"),
    company: asString(item?.company),
    role: asString(item?.role),
    location: asString(item?.location),
    start: asString(item?.start),
    end: asString(item?.end),
    current: Boolean(item?.current),
    bullets: asStringArray(item?.bullets),
  }));
}

function normalizeEducation(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("edu"),
    school: asString(item?.school),
    degree: asString(item?.degree),
    field: asString(item?.field),
    start: asString(item?.start),
    end: asString(item?.end),
    details: asString(item?.details),
  }));
}

function normalizeCertifications(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("cert"),
    name: asString(item?.name),
    issuer: asString(item?.issuer),
    year: asString(item?.year),
  }));
}

function normalizeProjects(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    id: asString(item?.id) || uid("proj"),
    name: asString(item?.name),
    url: asString(item?.url),
    summary: asString(item?.summary),
  }));
}

const PARSE_STATUSES = new Set(["none", "pending", "ready", "failed"]);

export function normalizeResume(input, userId) {
  const base = createBlankResume(userId);
  const raw = input && typeof input === "object" ? input : {};
  const parseStatus = PARSE_STATUSES.has(raw.parse_status) ? raw.parse_status : "none";

  return {
    ...base,
    id: Number(raw.id) || base.id,
    user_id: Number(userId),
    title: asString(raw.title) || "My Resume",
    basics: {
      ...emptyResumeBasics(),
      name: asString(raw.basics?.name),
      title: asString(raw.basics?.title),
      email: asString(raw.basics?.email),
      phone: asString(raw.basics?.phone),
      location: asString(raw.basics?.location),
      summary: asString(raw.basics?.summary),
      links: normalizeLinks(raw.basics?.links),
    },
    experience: normalizeExperience(raw.experience),
    education: normalizeEducation(raw.education),
    skills: asStringArray(raw.skills),
    certifications: normalizeCertifications(raw.certifications),
    projects: normalizeProjects(raw.projects),
    source_media_id:
      raw.source_media_id == null || raw.source_media_id === ""
        ? null
        : Number(raw.source_media_id),
    source_filename: raw.source_filename ? asString(raw.source_filename) : null,
    source_mime: raw.source_mime ? asString(raw.source_mime) : null,
    parsed_at: raw.parsed_at || null,
    parse_status: parseStatus,
    parse_error: raw.parse_error ? asString(raw.parse_error) : null,
    created_at: raw.created_at || base.created_at,
    updated_at: raw.updated_at || base.updated_at,
  };
}

export function mergeParsedIntoResume(existing, parsed) {
  const next = normalizeResume(
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
    },
    existing.user_id,
  );
  return next;
}

export { uid };
