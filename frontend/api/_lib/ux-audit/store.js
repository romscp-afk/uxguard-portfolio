import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { readStore, updateStore } from "../store.js";
import { notifyPlatformAdmins } from "../community.js";
import { executeUxAuditScan } from "./run-scan.js";
import { SCAN_LIMITATIONS } from "./scan-html.js";
import { SCAN_VERSION } from "./constants.js";

const MAX_AUDITS = 2000;

function nowIso() {
  return new Date().toISOString();
}

function nextId(audits) {
  return (audits || []).reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1;
}

function normalizeAudit(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    id: Number(raw.id),
    access_token: String(raw.access_token || ""),
    concerns: Array.isArray(raw.concerns) ? raw.concerns : [],
    category_scores: Array.isArray(raw.category_scores) ? raw.category_scores : [],
    findings: Array.isArray(raw.findings) ? raw.findings : [],
    limitations: Array.isArray(raw.limitations) ? raw.limitations : SCAN_LIMITATIONS,
    lead: raw.lead || null,
    capabilities: raw.capabilities || null,
  };
}

export async function getAuditByToken(token) {
  const store = await readStore();
  const audits = store.ux_audits || [];
  const audit = audits.find((a) => String(a.access_token) === String(token));
  return audit ? normalizeAudit(audit) : null;
}

export async function getAuditById(id) {
  const store = await readStore();
  const audit = (store.ux_audits || []).find((a) => Number(a.id) === Number(id));
  return audit ? normalizeAudit(audit) : null;
}

function buildEntryFromScan(payload, scan, meta = {}) {
  return {
    website_url: payload.website_url,
    normalized_url: scan.normalized_url,
    page_type: payload.page_type || null,
    primary_goal: payload.primary_goal || null,
    primary_audience: payload.primary_audience || null,
    company_name: payload.company_name || null,
    industry: payload.industry || null,
    main_concern: payload.main_concern || null,
    monthly_traffic_range: payload.monthly_traffic_range || null,
    current_conversion_rate: payload.current_conversion_rate || null,
    target_action: payload.target_action || null,
    concerns: payload.concerns || [],
    status: "completed",
    overall_score: scan.overall_score,
    growth_opportunity: scan.growth_opportunity,
    category_scores: scan.category_scores,
    findings: scan.findings,
    roadmap: scan.roadmap,
    summary: scan.summary,
    limitations: scan.limitations,
    capabilities: scan.capabilities,
    scan_version: scan.scan_version || SCAN_VERSION,
    failure_reason: null,
    completed_at: nowIso(),
    source: payload.source || "ux-audit",
    campaign: payload.campaign || null,
    submitter_ip_hash: meta.ipHash || null,
  };
}

export async function runUxAudit(payload, meta = {}) {
  const scan = await executeUxAuditScan(payload.website_url, {
    fetchOptions: meta.fetchOptions || {},
  });

  let saved = null;
  await updateStore((store) => {
    store.ux_audits = store.ux_audits || [];
    const id = nextId(store.ux_audits);
    const access_token = randomUUID();
    const entry = {
      id,
      access_token,
      ...buildEntryFromScan(payload, scan, meta),
      submitted_at: nowIso(),
      created_by_user_id: payload.created_by_user_id || null,
      lead: null,
      lead_status: "new",
      internal_notes: "",
    };
    store.ux_audits = [entry, ...store.ux_audits].slice(0, MAX_AUDITS);
    saved = normalizeAudit(entry);
    return store;
  });

  try {
    await notifyPlatformAdmins({
      type: "ux_audit",
      title: "New UX audit completed",
      message: `${saved.normalized_url} · Score ${saved.overall_score}/100`,
      link: "/admin/ux-audit-inbox",
    });
  } catch {
    // best-effort
  }

  return saved;
}

export async function rerunUxAudit(id, meta = {}) {
  const existing = await getAuditById(id);
  if (!existing) {
    const err = new Error("Audit not found.");
    err.status = 404;
    throw err;
  }

  const payload = {
    website_url: existing.website_url,
    page_type: existing.page_type,
    primary_goal: existing.primary_goal,
    primary_audience: existing.primary_audience,
    company_name: existing.company_name,
    industry: existing.industry,
    main_concern: existing.main_concern,
    monthly_traffic_range: existing.monthly_traffic_range,
    current_conversion_rate: existing.current_conversion_rate,
    target_action: existing.target_action,
    concerns: existing.concerns,
    source: existing.source,
    campaign: existing.campaign,
  };

  const scan = await executeUxAuditScan(existing.website_url, {
    fetchOptions: meta.fetchOptions || {},
  });

  let updated = null;
  await updateStore((store) => {
    const idx = (store.ux_audits || []).findIndex((a) => Number(a.id) === Number(id));
    if (idx < 0) return store;
    const current = {
      ...store.ux_audits[idx],
      ...buildEntryFromScan(payload, scan, { ipHash: existing.submitter_ip_hash }),
      submitted_at: existing.submitted_at,
      rerun_at: nowIso(),
      rerun_count: Number(existing.rerun_count || 0) + 1,
      lead: existing.lead,
      lead_status: existing.lead_status,
      internal_notes: existing.internal_notes || "",
    };
    store.ux_audits[idx] = current;
    updated = normalizeAudit(current);
    return store;
  });

  return updated;
}

export async function saveAuditFailure(payload, reason, meta = {}) {
  let saved = null;
  await updateStore((store) => {
    store.ux_audits = store.ux_audits || [];
    const id = nextId(store.ux_audits);
    const access_token = randomUUID();
    const entry = {
      id,
      access_token,
      website_url: payload.website_url,
      normalized_url: payload.website_url,
      page_type: payload.page_type || null,
      primary_goal: payload.primary_goal || null,
      status: "failed",
      failure_reason: reason,
      submitted_at: nowIso(),
      completed_at: nowIso(),
      scan_version: SCAN_VERSION,
      lead_status: "new",
      source: payload.source || "ux-audit",
      submitter_ip_hash: meta.ipHash || null,
    };
    store.ux_audits = [entry, ...store.ux_audits].slice(0, MAX_AUDITS);
    saved = normalizeAudit(entry);
    return store;
  });
  return saved;
}

export async function saveAuditLead(token, lead) {
  let updated = null;
  await updateStore((store) => {
    store.ux_audits = store.ux_audits || [];
    const idx = store.ux_audits.findIndex((a) => String(a.access_token) === String(token));
    if (idx < 0) return store;
    const current = { ...store.ux_audits[idx] };
    current.lead = {
      ...lead,
      created_at: nowIso(),
    };
    current.lead_status = "qualified";
    store.ux_audits[idx] = current;
    updated = normalizeAudit(current);
    return store;
  });
  return updated;
}

export async function listUxAudits({ q = "", status } = {}) {
  const store = await readStore();
  let list = (store.ux_audits || []).map(normalizeAudit).filter(Boolean);
  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    list = list.filter((a) =>
      [a.website_url, a.normalized_url, a.company_name, a.lead?.business_email, a.lead?.full_name]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }
  if (status) list = list.filter((a) => a.status === status);
  return list.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
}

export async function updateUxAuditAdmin(id, patch = {}) {
  let updated = null;
  await updateStore((store) => {
    const idx = (store.ux_audits || []).findIndex((a) => Number(a.id) === Number(id));
    if (idx < 0) return store;
    const current = { ...store.ux_audits[idx] };
    if (patch.lead_status) current.lead_status = patch.lead_status;
    if (typeof patch.internal_notes === "string") current.internal_notes = patch.internal_notes.slice(0, 5000);
    store.ux_audits[idx] = current;
    updated = normalizeAudit(current);
    return store;
  });
  return updated;
}

export function hashIp(ip) {
  return createHash("sha256").update(String(ip || "unknown")).digest("hex").slice(0, 32);
}

export function publicAuditView(audit) {
  if (!audit) return null;
  return {
    id: audit.id,
    access_token: audit.access_token,
    website_url: audit.website_url,
    normalized_url: audit.normalized_url,
    page_type: audit.page_type,
    primary_goal: audit.primary_goal,
    status: audit.status,
    overall_score: audit.overall_score,
    growth_opportunity: audit.growth_opportunity,
    category_scores: audit.category_scores,
    findings: audit.findings,
    roadmap: audit.roadmap,
    summary: audit.summary,
    limitations: audit.limitations,
    capabilities: audit.capabilities,
    scan_version: audit.scan_version,
    submitted_at: audit.submitted_at,
    completed_at: audit.completed_at,
    failure_reason: audit.failure_reason,
    has_lead: Boolean(audit.lead),
    rerun_count: audit.rerun_count || 0,
  };
}
