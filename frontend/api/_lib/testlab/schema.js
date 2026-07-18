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

export const PROJECT_STATUSES = ["active", "archived", "deleted"];
export const TARGET_ENVIRONMENTS = ["production", "staging", "preview", "development"];
export const VERIFICATION_METHODS = ["dns_txt", "html_file", "meta_tag"];
export const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "expired"];
export const PROJECT_ROLES = [
  "owner",
  "test_manager",
  "tester",
  "developer",
  "product_reviewer",
  "viewer",
];
export const REQUIREMENT_SOURCES = ["manual", "paste", "import", "openapi", "ai"];
export const TEST_PRIORITIES = ["critical", "high", "medium", "low"];
export const TEST_TYPES = [
  "ui",
  "functional",
  "e2e",
  "responsive",
  "accessibility",
  "performance",
  "api",
  "visual",
  "smoke",
];
export const RUN_STATUSES = [
  "queued",
  "running",
  "passed",
  "failed",
  "cancelled",
  "error",
  "timed_out",
];
export const BROWSERS = ["chromium", "firefox", "webkit"];
export const DEFECT_STATUSES = ["open", "in_progress", "fixed", "retest", "closed", "wont_fix"];
export const DEFECT_SEVERITIES = ["critical", "high", "medium", "low"];

export function defaultSafetySettings(environment) {
  const isProd = environment === "production";
  return {
    allow_form_submit: !isProd,
    allow_destructive_actions: false,
    read_only_exploration: isProd,
    max_pages: isProd ? 25 : 100,
    max_run_minutes: 15,
    capture_screenshots: true,
    capture_console: true,
    capture_network_errors: true,
  };
}

export function normalizeProject(input, ownerUserId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const status = PROJECT_STATUSES.includes(raw.status) ? raw.status : "active";
  return {
    id: asString(raw.id) || uid("proj"),
    owner_user_id: Number(ownerUserId ?? raw.owner_user_id) || 0,
    name: asString(raw.name) || "Untitled project",
    description: asString(raw.description),
    status,
    ownership_confirmed: Boolean(raw.ownership_confirmed),
    default_browsers: asStringArray(raw.default_browsers).filter((b) => BROWSERS.includes(b)).length
      ? asStringArray(raw.default_browsers).filter((b) => BROWSERS.includes(b))
      : ["chromium"],
    tags: asStringArray(raw.tags),
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
    archived_at: raw.archived_at || null,
    deleted_at: status === "deleted" ? raw.deleted_at || now : null,
  };
}

export function normalizeTarget(input, projectId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const environment = TARGET_ENVIRONMENTS.includes(raw.environment)
    ? raw.environment
    : "staging";
  const verification_status = VERIFICATION_STATUSES.includes(raw.verification_status)
    ? raw.verification_status
    : "unverified";
  return {
    id: asString(raw.id) || uid("tgt"),
    project_id: asString(projectId ?? raw.project_id),
    label: asString(raw.label) || environment,
    base_url: asString(raw.base_url),
    environment,
    verification_status,
    verification_method: VERIFICATION_METHODS.includes(raw.verification_method)
      ? raw.verification_method
      : null,
    verified_at: raw.verified_at || null,
    verification_expires_at: raw.verification_expires_at || null,
    safety_settings: {
      ...defaultSafetySettings(environment),
      ...(raw.safety_settings && typeof raw.safety_settings === "object" ? raw.safety_settings : {}),
    },
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function normalizeMember(input, projectId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const role = PROJECT_ROLES.includes(raw.role) ? raw.role : "viewer";
  return {
    id: asString(raw.id) || uid("mem"),
    project_id: asString(projectId ?? raw.project_id),
    user_id: Number(raw.user_id) || 0,
    email: asString(raw.email).toLowerCase() || null,
    role,
    invited_by: Number(raw.invited_by) || null,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function normalizeRequirement(input, projectId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  return {
    id: asString(raw.id) || uid("req"),
    project_id: asString(projectId ?? raw.project_id),
    title: asString(raw.title) || "Untitled requirement",
    description: asString(raw.description),
    source: REQUIREMENT_SOURCES.includes(raw.source) ? raw.source : "manual",
    source_ref: asString(raw.source_ref) || null,
    priority: TEST_PRIORITIES.includes(raw.priority) ? raw.priority : "medium",
    tags: asStringArray(raw.tags),
    acceptance_criteria: asStringArray(raw.acceptance_criteria),
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function emptyTestStep(overrides = {}) {
  return {
    id: uid("step"),
    action: "goto",
    selector: "",
    value: "",
    assertion: "",
    description: "",
    ...overrides,
  };
}

export function normalizeTestCase(input, projectId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((step, index) => ({
        id: asString(step?.id) || uid("step"),
        order: Number(step?.order) || index + 1,
        action: asString(step?.action) || "goto",
        selector: asString(step?.selector),
        value: asString(step?.value),
        assertion: asString(step?.assertion),
        description: asString(step?.description),
      }))
    : [];
  return {
    id: asString(raw.id) || uid("tc"),
    project_id: asString(projectId ?? raw.project_id),
    requirement_ids: asStringArray(raw.requirement_ids),
    title: asString(raw.title) || "Untitled test",
    description: asString(raw.description),
    type: TEST_TYPES.includes(raw.type) ? raw.type : "functional",
    priority: TEST_PRIORITIES.includes(raw.priority) ? raw.priority : "medium",
    tags: asStringArray(raw.tags),
    steps,
    data_sets: Array.isArray(raw.data_sets) ? raw.data_sets : [],
    enabled: raw.enabled !== false,
    generated_by: asString(raw.generated_by) || "manual",
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function normalizeRun(input, projectId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  const status = RUN_STATUSES.includes(raw.status) ? raw.status : "queued";
  const browsers = asStringArray(raw.browsers).filter((b) => BROWSERS.includes(b));
  return {
    id: asString(raw.id) || uid("run"),
    project_id: asString(projectId ?? raw.project_id),
    target_id: asString(raw.target_id),
    test_case_ids: asStringArray(raw.test_case_ids),
    status,
    browsers: browsers.length ? browsers : ["chromium"],
    viewports: Array.isArray(raw.viewports) && raw.viewports.length
      ? raw.viewports
      : [{ name: "desktop", width: 1280, height: 720 }],
    options: {
      accessibility: Boolean(raw.options?.accessibility),
      performance: Boolean(raw.options?.performance),
      broken_links: Boolean(raw.options?.broken_links),
      visual: Boolean(raw.options?.visual),
      ...(raw.options && typeof raw.options === "object" ? raw.options : {}),
    },
    triggered_by: Number(raw.triggered_by) || 0,
    cancel_requested: Boolean(raw.cancel_requested),
    queued_at: raw.queued_at || now,
    started_at: raw.started_at || null,
    finished_at: raw.finished_at || null,
    summary: raw.summary && typeof raw.summary === "object"
      ? raw.summary
      : { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0 },
    error_message: asString(raw.error_message) || null,
    worker_id: asString(raw.worker_id) || null,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function normalizeResult(input, runId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  return {
    id: asString(raw.id) || uid("res"),
    run_id: asString(runId ?? raw.run_id),
    test_case_id: asString(raw.test_case_id),
    browser: BROWSERS.includes(raw.browser) ? raw.browser : "chromium",
    viewport: raw.viewport || { name: "desktop", width: 1280, height: 720 },
    status: ["passed", "failed", "skipped", "error", "cancelled"].includes(raw.status)
      ? raw.status
      : "error",
    duration_ms: Math.max(0, Number(raw.duration_ms) || 0),
    steps: Array.isArray(raw.steps) ? raw.steps : [],
    screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : [],
    console_errors: asStringArray(raw.console_errors),
    network_errors: asStringArray(raw.network_errors),
    accessibility: raw.accessibility || null,
    performance: raw.performance || null,
    broken_links: Array.isArray(raw.broken_links) ? raw.broken_links : [],
    visual_diff: raw.visual_diff || null,
    error_message: asString(raw.error_message) || null,
    created_at: raw.created_at || now,
  };
}

export function normalizeDefect(input, projectId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  return {
    id: asString(raw.id) || uid("def"),
    project_id: asString(projectId ?? raw.project_id),
    title: asString(raw.title) || "Untitled defect",
    description: asString(raw.description),
    severity: DEFECT_SEVERITIES.includes(raw.severity) ? raw.severity : "medium",
    status: DEFECT_STATUSES.includes(raw.status) ? raw.status : "open",
    test_case_id: asString(raw.test_case_id) || null,
    run_id: asString(raw.run_id) || null,
    result_id: asString(raw.result_id) || null,
    assignee_user_id: Number(raw.assignee_user_id) || null,
    created_by: Number(raw.created_by) || 0,
    retest_run_id: asString(raw.retest_run_id) || null,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function normalizeSchedule(input, projectId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  return {
    id: asString(raw.id) || uid("sch"),
    project_id: asString(projectId ?? raw.project_id),
    name: asString(raw.name) || "Regression schedule",
    cron: asString(raw.cron) || "0 9 * * 1-5",
    timezone: asString(raw.timezone) || "UTC",
    target_id: asString(raw.target_id),
    test_case_ids: asStringArray(raw.test_case_ids),
    browsers: asStringArray(raw.browsers).filter((b) => BROWSERS.includes(b)).length
      ? asStringArray(raw.browsers).filter((b) => BROWSERS.includes(b))
      : ["chromium"],
    enabled: raw.enabled !== false,
    last_run_at: raw.last_run_at || null,
    next_run_at: raw.next_run_at || null,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function normalizeSecret(input, projectId) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  return {
    id: asString(raw.id) || uid("sec"),
    project_id: asString(projectId ?? raw.project_id),
    key: asString(raw.key).toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
    // Never return plaintext via API — stored encrypted-ish (base64 obfuscation for Blob MVP)
    value_enc: asString(raw.value_enc),
    created_by: Number(raw.created_by) || 0,
    created_at: raw.created_at || now,
    updated_at: raw.updated_at || now,
  };
}

export function normalizeAuditEvent(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    id: asString(raw.id) || uid("aud"),
    project_id: asString(raw.project_id) || null,
    actor_user_id: Number(raw.actor_user_id) || 0,
    action: asString(raw.action),
    meta: raw.meta && typeof raw.meta === "object" ? raw.meta : {},
    created_at: raw.created_at || new Date().toISOString(),
  };
}

export function normalizeVerificationChallenge(input) {
  const raw = input && typeof input === "object" ? input : {};
  const now = new Date().toISOString();
  return {
    id: asString(raw.id) || uid("vc"),
    target_id: asString(raw.target_id),
    project_id: asString(raw.project_id),
    method: VERIFICATION_METHODS.includes(raw.method) ? raw.method : "meta_tag",
    token: asString(raw.token),
    status: ["pending", "verified", "expired"].includes(raw.status) ? raw.status : "pending",
    instructions: asString(raw.instructions),
    expires_at: raw.expires_at || new Date(Date.now() + 7 * 86400000).toISOString(),
    created_at: raw.created_at || now,
    verified_at: raw.verified_at || null,
  };
}

export function encodeSecret(value) {
  return Buffer.from(String(value || ""), "utf8").toString("base64");
}

export function decodeSecret(valueEnc) {
  try {
    return Buffer.from(String(valueEnc || ""), "base64").toString("utf8");
  } catch {
    return "";
  }
}

export { uid };
