function uid(prefix = "tl") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

export const TIMELINE_TYPES = [
  "employment",
  "promotion",
  "education",
  "project",
  "certification",
  "award",
  "volunteering",
  "career_break",
  "milestone",
  "custom",
];

export const PROFILE_VISIBILITY = ["private", "employers", "employers_after_apply", "public_link"];
export const ENTRY_VISIBILITY = ["private", "employers", "public"];
export const SOURCE_TYPES = ["manual", "resume_import", "system"];
export const VERIFICATION_STATUSES = ["unverified", "self_attested", "pending", "verified"];

export const DEFAULT_GAP_MONTHS = 3;

export function defaultDisplaySettings() {
  return {
    sort: "newest",
    group_by_year: false,
    show_descriptions: true,
    show_career_breaks: true,
    show_only_resume_selected: false,
  };
}

export function defaultWorkspaces(user) {
  const role = user?.role === "viewer" ? "viewer" : user?.role === "admin" ? "admin" : "professional";
  const canEdit = role === "admin" || role === "professional";
  const existing = user?.workspaces && typeof user.workspaces === "object" ? user.workspaces : {};
  return {
    candidate: existing.candidate !== undefined ? Boolean(existing.candidate) : canEdit,
    employer: existing.employer !== undefined ? Boolean(existing.employer) : false,
  };
}

export function normalizeActiveWorkspace(value, workspaces) {
  if (value === "employer" && workspaces?.employer) return "employer";
  return "candidate";
}

export function emptyCareerProfile(userId, overrides = {}) {
  const now = new Date().toISOString();
  return normalizeCareerProfile(
    {
      id: 0,
      user_id: Number(userId),
      headline: "",
      summary: "",
      total_experience_months: 0,
      visibility: "private",
      public_slug: null,
      public_link_enabled: false,
      display_settings: defaultDisplaySettings(),
      created_at: now,
      updated_at: now,
      ...overrides,
    },
    userId,
  );
}

export function normalizeCareerProfile(input, userId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const visibility = PROFILE_VISIBILITY.includes(raw.visibility) ? raw.visibility : "private";
  const parsedId = Number(raw.id);
  return {
    id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : 0,
    user_id: Number(userId ?? raw.user_id) || 0,
    headline: asString(raw.headline),
    summary: asString(raw.summary),
    total_experience_months: Math.max(0, Number(raw.total_experience_months) || 0),
    visibility,
    public_slug: raw.public_slug ? asString(raw.public_slug) : null,
    public_link_enabled: Boolean(raw.public_link_enabled) && visibility === "public_link",
    display_settings: {
      ...defaultDisplaySettings(),
      ...(raw.display_settings && typeof raw.display_settings === "object" ? raw.display_settings : {}),
    },
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function emptyTimelineEntry(careerProfileId, overrides = {}) {
  const now = new Date().toISOString();
  return normalizeTimelineEntry({
    id: 0,
    career_profile_id: Number(careerProfileId) || 0,
    type: "employment",
    title: "",
    organisation: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
    achievements: [],
    skills: [],
    employment_type: "",
    working_arrangement: "",
    previous_title: "",
    new_title: "",
    field_of_study: "",
    issuer: "",
    expiration_date: "",
    credential_details: "",
    supporting_url: "",
    break_reason: "",
    custom_type_label: "",
    source_type: "manual",
    source_resume_id: null,
    source_section: null,
    source_item_id: null,
    verification_status: "unverified",
    visibility: "private",
    hidden: false,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  });
}

export function normalizeTimelineEntry(input) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const type = TIMELINE_TYPES.includes(raw.type) ? raw.type : "custom";
  const sourceType = SOURCE_TYPES.includes(raw.source_type) ? raw.source_type : "manual";
  const visibility = ENTRY_VISIBILITY.includes(raw.visibility) ? raw.visibility : "private";
  const verification = VERIFICATION_STATUSES.includes(raw.verification_status)
    ? raw.verification_status
    : "unverified";

  return {
    id: Number(raw.id) || 0,
    career_profile_id: Number(raw.career_profile_id) || 0,
    type,
    title: asString(raw.title),
    organisation: asString(raw.organisation || raw.organization || raw.company || raw.school),
    location: asString(raw.location),
    start_date: asString(raw.start_date || raw.start),
    end_date: asString(raw.end_date || raw.end),
    is_current: Boolean(raw.is_current ?? raw.current),
    description: asString(raw.description || raw.summary || raw.details),
    achievements: asStringArray(raw.achievements || raw.bullets || raw.outcomes),
    skills: asStringArray(raw.skills || raw.tools),
    employment_type: asString(raw.employment_type),
    working_arrangement: asString(raw.working_arrangement || raw.work_mode),
    previous_title: asString(raw.previous_title),
    new_title: asString(raw.new_title),
    field_of_study: asString(raw.field_of_study || raw.field),
    issuer: asString(raw.issuer),
    expiration_date: asString(raw.expiration_date),
    credential_details: asString(raw.credential_details || raw.credential_id),
    supporting_url: asString(raw.supporting_url || raw.url || raw.credential_url),
    break_reason: asString(raw.break_reason),
    custom_type_label: asString(raw.custom_type_label),
    source_type: sourceType,
    source_resume_id:
      raw.source_resume_id == null || raw.source_resume_id === ""
        ? null
        : Number(raw.source_resume_id),
    source_section: raw.source_section ? asString(raw.source_section) : null,
    source_item_id: raw.source_item_id ? asString(raw.source_item_id) : null,
    verification_status: verification,
    visibility,
    hidden: Boolean(raw.hidden),
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : 0,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
    deleted_at: raw.deleted_at || null,
  };
}

export function normalizeTimelineSelection(input) {
  const raw = input && typeof input === "object" ? input : {};
  const content =
    raw.resume_specific_content && typeof raw.resume_specific_content === "object"
      ? {
          title: asString(raw.resume_specific_content.title),
          description: asString(raw.resume_specific_content.description),
          achievements: asStringArray(raw.resume_specific_content.achievements),
          skills: asStringArray(raw.resume_specific_content.skills),
        }
      : null;
  return {
    id: asString(raw.id) || uid("sel"),
    timeline_entry_id: Number(raw.timeline_entry_id) || 0,
    is_included: raw.is_included !== false,
    resume_specific_content: content,
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

export function normalizeKeyPart(value) {
  return asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function entryMatchKey(entry) {
  return [
    entry.type || "",
    normalizeKeyPart(entry.organisation),
    normalizeKeyPart(entry.title),
    normalizeKeyPart(entry.start_date).slice(0, 7),
    entry.is_current ? "current" : normalizeKeyPart(entry.end_date).slice(0, 7),
  ].join("|");
}

export function parseLooseDate(value) {
  const raw = asString(value);
  if (!raw) return null;
  if (/^\d{4}$/.test(raw)) return new Date(`${raw}-01-01T00:00:00.000Z`);
  if (/^\d{4}-\d{2}$/.test(raw)) return new Date(`${raw}-01T00:00:00.000Z`);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function monthsBetween(start, end) {
  if (!start || !end) return 0;
  const years = end.getUTCFullYear() - start.getUTCFullYear();
  const months = end.getUTCMonth() - start.getUTCMonth();
  return Math.max(0, years * 12 + months);
}

export function formatDurationMonths(months) {
  if (!months || months <= 0) return "";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years && rem) return `${years}y ${rem}m`;
  if (years) return `${years}y`;
  return `${rem}m`;
}

export function computeEntryDurationMonths(entry, now = new Date()) {
  const start = parseLooseDate(entry.start_date);
  if (!start) return 0;
  const end = entry.is_current ? now : parseLooseDate(entry.end_date) || now;
  return monthsBetween(start, end);
}
