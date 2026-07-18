function uid(prefix = "h") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function asString(value) {
  return value == null ? "" : String(value).trim();
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function asJson(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  return fallback;
}

export const COMPANY_STATUSES = ["pending", "verified", "rejected", "suspended"];
export const MEMBER_ROLES = ["owner", "admin", "recruiter", "hiring_manager", "reviewer"];
export const MEMBER_STATUSES = ["invited", "active", "revoked"];

export const JOB_STATUSES = [
  "draft",
  "pending_review",
  "scheduled",
  "published",
  "paused",
  "closed",
  "expired",
  "archived",
  "rejected",
  "suspended",
];

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "freelance",
];

export const WORKPLACE_TYPES = ["onsite", "hybrid", "remote"];
export const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "lead", "executive"];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "viewed",
  "under_review",
  "shortlisted",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];

export const CANDIDATE_VISIBLE_STATUSES = [
  "draft",
  "submitted",
  "viewed",
  "under_review",
  "shortlisted",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];

export const QUESTION_TYPES = [
  "yes_no",
  "single_choice",
  "multiple_choice",
  "short_answer",
  "numeric",
  "date",
  "file",
];

export const DEFAULT_MEMBER_PERMISSIONS = {
  owner: {
    company_edit: true,
    job_create: true,
    job_publish: true,
    candidate_access: true,
    stage_update: true,
    internal_notes: true,
    team_manage: true,
    analytics: true,
  },
  admin: {
    company_edit: true,
    job_create: true,
    job_publish: true,
    candidate_access: true,
    stage_update: true,
    internal_notes: true,
    team_manage: true,
    analytics: true,
  },
  recruiter: {
    company_edit: false,
    job_create: true,
    job_publish: true,
    candidate_access: true,
    stage_update: true,
    internal_notes: true,
    team_manage: false,
    analytics: true,
  },
  hiring_manager: {
    company_edit: false,
    job_create: true,
    job_publish: false,
    candidate_access: true,
    stage_update: true,
    internal_notes: true,
    team_manage: false,
    analytics: false,
  },
  reviewer: {
    company_edit: false,
    job_create: false,
    job_publish: false,
    candidate_access: true,
    stage_update: false,
    internal_notes: true,
    team_manage: false,
    analytics: false,
  },
};

export function slugify(value) {
  return asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `company-${Date.now().toString(36)}`;
}

export function normalizeCompany(input) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const status = COMPANY_STATUSES.includes(raw.verification_status)
    ? raw.verification_status
    : "pending";
  return {
    id: Number(raw.id) || 0,
    owner_user_id: Number(raw.owner_user_id) || 0,
    legal_name: asString(raw.legal_name),
    display_name: asString(raw.display_name || raw.legal_name),
    slug: asString(raw.slug) || slugify(raw.display_name || raw.legal_name || "company"),
    logo_url: asString(raw.logo_url),
    cover_image_url: asString(raw.cover_image_url),
    industry: asString(raw.industry),
    company_size: asString(raw.company_size),
    founded_year: raw.founded_year ? Number(raw.founded_year) : null,
    headquarters: asString(raw.headquarters),
    website: asString(raw.website),
    linkedin_url: asString(raw.linkedin_url),
    description: asString(raw.description),
    culture: asString(raw.culture),
    benefits: asStringArray(raw.benefits),
    locations: Array.isArray(raw.locations) ? raw.locations : [],
    contact_email: asString(raw.contact_email),
    verification_email_domain: asString(raw.verification_email_domain),
    registration_number: asString(raw.registration_number),
    verification_documents: Array.isArray(raw.verification_documents)
      ? raw.verification_documents
      : [],
    verification_status: status,
    moderation_note: asString(raw.moderation_note),
    verified_at: raw.verified_at || null,
    terms_accepted_at: raw.terms_accepted_at || null,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
    deleted_at: raw.deleted_at || null,
  };
}

export function normalizeCompanyMember(input) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const role = MEMBER_ROLES.includes(raw.role) ? raw.role : "reviewer";
  const status = MEMBER_STATUSES.includes(raw.status) ? raw.status : "invited";
  const defaults = DEFAULT_MEMBER_PERMISSIONS[role] || DEFAULT_MEMBER_PERMISSIONS.reviewer;
  return {
    id: Number(raw.id) || 0,
    company_id: Number(raw.company_id) || 0,
    user_id: raw.user_id == null || raw.user_id === "" ? null : Number(raw.user_id),
    email: asString(raw.email).toLowerCase(),
    role,
    permissions: { ...defaults, ...(asJson(raw.permissions, {}) || {}) },
    status,
    invited_by: raw.invited_by == null ? null : Number(raw.invited_by),
    assigned_job_ids: Array.isArray(raw.assigned_job_ids)
      ? raw.assigned_job_ids.map(Number).filter(Boolean)
      : [],
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function emptyJob(companyId, createdBy) {
  const now = new Date().toISOString();
  return normalizeJob({
    company_id: companyId,
    created_by: createdBy,
    title: "",
    status: "draft",
    created_at: now,
    updated_at: now,
  });
}

export function normalizeJob(input) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const status = JOB_STATUSES.includes(raw.status) ? raw.status : "draft";
  const salary = asJson(raw.salary, {}) || {};
  const min = salary.min != null && salary.min !== "" ? Number(salary.min) : null;
  const max = salary.max != null && salary.max !== "" ? Number(salary.max) : null;
  return {
    id: Number(raw.id) || 0,
    company_id: Number(raw.company_id) || 0,
    created_by: Number(raw.created_by) || 0,
    title: asString(raw.title),
    department: asString(raw.department),
    summary: asString(raw.summary),
    description: asString(raw.description),
    responsibilities: asStringArray(raw.responsibilities),
    outcomes: asStringArray(raw.outcomes),
    team_info: asString(raw.team_info),
    reporting_line: asString(raw.reporting_line),
    required_skills: asStringArray(raw.required_skills),
    preferred_skills: asStringArray(raw.preferred_skills),
    employment_type: EMPLOYMENT_TYPES.includes(raw.employment_type)
      ? raw.employment_type
      : "full_time",
    experience_level: EXPERIENCE_LEVELS.includes(raw.experience_level)
      ? raw.experience_level
      : "mid",
    workplace_type: WORKPLACE_TYPES.includes(raw.workplace_type)
      ? raw.workplace_type
      : "hybrid",
    vacancies: Math.max(1, Number(raw.vacancies) || 1),
    country: asString(raw.country),
    city: asString(raw.city),
    remote_restrictions: asString(raw.remote_restrictions),
    hiring_manager: asString(raw.hiring_manager),
    deadline: asString(raw.deadline),
    expected_start_date: asString(raw.expected_start_date),
    location: {
      country: asString(raw.location?.country || raw.country),
      city: asString(raw.location?.city || raw.city),
      workplace_type: WORKPLACE_TYPES.includes(raw.location?.workplace_type)
        ? raw.location.workplace_type
        : WORKPLACE_TYPES.includes(raw.workplace_type)
          ? raw.workplace_type
          : "hybrid",
    },
    salary: {
      visible: Boolean(salary.visible),
      currency: asString(salary.currency) || "USD",
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null,
      period: asString(salary.period) || "year",
      bonus: asString(salary.bonus),
    },
    benefits: asStringArray(raw.benefits),
    relocation_support: Boolean(raw.relocation_support),
    visa_sponsorship: Boolean(raw.visa_sponsorship),
    education_requirements: asStringArray(raw.education_requirements),
    certifications: asStringArray(raw.certifications),
    languages: asStringArray(raw.languages),
    work_authorization: asString(raw.work_authorization),
    travel_requirements: asString(raw.travel_requirements),
    portfolio_required: Boolean(raw.portfolio_required),
    resume_required: raw.resume_required !== false,
    cover_letter_required: Boolean(raw.cover_letter_required),
    min_experience_years:
      raw.min_experience_years == null || raw.min_experience_years === ""
        ? null
        : Number(raw.min_experience_years),
    application_settings: {
      mode: asString(raw.application_settings?.mode) || "internal",
      external_url: asString(raw.application_settings?.external_url),
      application_email: asString(raw.application_settings?.application_email),
      auto_close_on_vacancy_limit: Boolean(raw.application_settings?.auto_close_on_vacancy_limit),
      confirmation_message:
        asString(raw.application_settings?.confirmation_message) ||
        "Thank you for applying. We will review your application shortly.",
      assigned_team: Array.isArray(raw.application_settings?.assigned_team)
        ? raw.application_settings.assigned_team.map(Number).filter(Boolean)
        : [],
      notify_on_application: raw.application_settings?.notify_on_application !== false,
      allow_reapply: Boolean(raw.application_settings?.allow_reapply),
      show_applicant_count: Boolean(raw.application_settings?.show_applicant_count),
    },
    questions: Array.isArray(raw.questions)
      ? raw.questions.map(normalizeJobQuestion).filter((q) => q.question)
      : [],
    wizard_step: Math.max(1, Number(raw.wizard_step) || 1),
    revision: Math.max(1, Number(raw.revision) || 1),
    status,
    published_at: raw.published_at || null,
    closed_at: raw.closed_at || null,
    scheduled_at: raw.scheduled_at || null,
    moderation_note: asString(raw.moderation_note),
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
    deleted_at: raw.deleted_at || null,
  };
}

export function normalizeJobQuestion(input, index = 0) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    id: asString(raw.id) || uid("q"),
    question: asString(raw.question),
    type: QUESTION_TYPES.includes(raw.type) ? raw.type : "short_answer",
    options: asStringArray(raw.options),
    is_required: Boolean(raw.is_required),
    is_knockout: Boolean(raw.is_knockout),
    knockout_rule: asJson(raw.knockout_rule, null),
    sort_order: Number.isFinite(Number(raw.sort_order)) ? Number(raw.sort_order) : index,
  };
}

export function normalizeSavedJob(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    id: Number(raw.id) || 0,
    user_id: Number(raw.user_id) || 0,
    job_id: Number(raw.job_id) || 0,
    created_at: raw.created_at || new Date().toISOString(),
  };
}

export function normalizeApplication(input) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const status = APPLICATION_STATUSES.includes(raw.status) ? raw.status : "draft";
  const visible = CANDIDATE_VISIBLE_STATUSES.includes(raw.candidate_visible_status)
    ? raw.candidate_visible_status
    : status === "under_review"
      ? "under_review"
      : status;
  return {
    id: Number(raw.id) || 0,
    job_id: Number(raw.job_id) || 0,
    company_id: Number(raw.company_id) || 0,
    candidate_user_id: Number(raw.candidate_user_id) || 0,
    resume_id: raw.resume_id == null ? null : Number(raw.resume_id),
    resume_version_id: raw.resume_version_id ? asString(raw.resume_version_id) : null,
    resume_snapshot: asJson(raw.resume_snapshot, null),
    career_profile_snapshot: asJson(raw.career_profile_snapshot, null),
    contact_snapshot: asJson(raw.contact_snapshot, {}) || {},
    cover_letter: asString(raw.cover_letter),
    portfolio_url: asString(raw.portfolio_url),
    screening_answers: Array.isArray(raw.screening_answers) ? raw.screening_answers : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    status,
    candidate_visible_status: visible,
    assigned_member_id:
      raw.assigned_member_id == null || raw.assigned_member_id === ""
        ? null
        : Number(raw.assigned_member_id),
    tags: asStringArray(raw.tags),
    match_summary: asJson(raw.match_summary, null),
    consent_accepted_at: raw.consent_accepted_at || null,
    submitted_at: raw.submitted_at || null,
    withdrawn_at: raw.withdrawn_at || null,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function normalizeStageHistory(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    id: Number(raw.id) || 0,
    application_id: Number(raw.application_id) || 0,
    previous_stage: asString(raw.previous_stage),
    new_stage: asString(raw.new_stage),
    candidate_visible_stage: asString(raw.candidate_visible_stage),
    changed_by: Number(raw.changed_by) || 0,
    note: asString(raw.note),
    created_at: raw.created_at || new Date().toISOString(),
  };
}

export function normalizeInternalNote(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    id: Number(raw.id) || 0,
    application_id: Number(raw.application_id) || 0,
    author_user_id: Number(raw.author_user_id) || 0,
    note: asString(raw.note),
    visibility: asString(raw.visibility) || "internal",
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

export function normalizeInvitation(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    id: Number(raw.id) || 0,
    company_id: Number(raw.company_id) || 0,
    email: asString(raw.email).toLowerCase(),
    role: MEMBER_ROLES.includes(raw.role) ? raw.role : "reviewer",
    token_hash: asString(raw.token_hash),
    invited_by: Number(raw.invited_by) || 0,
    assigned_job_ids: Array.isArray(raw.assigned_job_ids)
      ? raw.assigned_job_ids.map(Number).filter(Boolean)
      : [],
    expires_at: raw.expires_at || null,
    accepted_at: raw.accepted_at || null,
    revoked_at: raw.revoked_at || null,
    created_at: raw.created_at || new Date().toISOString(),
  };
}

export function normalizeJobReport(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    id: Number(raw.id) || 0,
    job_id: Number(raw.job_id) || 0,
    reported_by: Number(raw.reported_by) || 0,
    reason: asString(raw.reason),
    description: asString(raw.description),
    status: asString(raw.status) || "open",
    reviewed_by: raw.reviewed_by == null ? null : Number(raw.reviewed_by),
    created_at: raw.created_at || new Date().toISOString(),
    resolved_at: raw.resolved_at || null,
  };
}

export function normalizeAnalyticsEvent(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    id: Number(raw.id) || 0,
    event: asString(raw.event),
    user_id: raw.user_id == null ? null : Number(raw.user_id),
    meta: asJson(raw.meta, {}) || {},
    created_at: raw.created_at || new Date().toISOString(),
  };
}

export function publicCompanyView(company) {
  if (!company) return null;
  return {
    id: company.id,
    display_name: company.display_name,
    slug: company.slug,
    logo_url: company.logo_url,
    cover_image_url: company.cover_image_url,
    industry: company.industry,
    company_size: company.company_size,
    founded_year: company.founded_year,
    headquarters: company.headquarters,
    website: company.website,
    linkedin_url: company.linkedin_url,
    description: company.description,
    culture: company.culture,
    benefits: company.benefits,
    locations: company.locations,
    verification_status: company.verification_status,
  };
}

export function publicJobView(job, company) {
  if (!job) return null;
  return {
    ...job,
    hiring_manager: undefined,
    application_settings: {
      mode: job.application_settings?.mode,
      external_url:
        job.application_settings?.mode === "external"
          ? job.application_settings.external_url
          : undefined,
      confirmation_message: undefined,
      assigned_team: undefined,
      notify_on_application: undefined,
      allow_reapply: job.application_settings?.allow_reapply,
      show_applicant_count: job.application_settings?.show_applicant_count,
    },
    company: publicCompanyView(company),
  };
}

export function validateSalary(salary) {
  if (!salary) return null;
  if (salary.min != null && salary.max != null && Number(salary.max) < Number(salary.min)) {
    return "Maximum salary cannot be lower than minimum salary";
  }
  return null;
}
