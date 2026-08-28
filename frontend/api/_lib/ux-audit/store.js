import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { readStore, updateStore } from "../store.js";
import { notifyPlatformAdmins } from "../community.js";
import { fetchPublicPage } from "./fetch-page.js";
import { normalizeAuditUrl } from "./url.js";
import { scanHtml, SCAN_LIMITATIONS } from "./scan-html.js";
import {
  buildCategoryScores,
  calculateOverallScore,
  enrichFindings,
  growthOpportunityLabel,
  roadmapBuckets,
} from "./scoring.js";
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
  };
}

export async function getAuditByToken(token) {
  const store = await readStore();
  const audits = store.ux_audits || [];
  const audit = audits.find((a) => String(a.access_token) === String(token));
  return audit ? normalizeAudit(audit) : null;
}

export async function runUxAudit(payload, meta = {}) {
  const urlInfo = normalizeAuditUrl(payload.website_url);
  const fetchResult = await fetchPublicPage(urlInfo.normalized, meta.fetchOptions || {});

  const findings = scanHtml({
    html: fetchResult.html,
    pageUrl: fetchResult.finalUrl,
    responseTimeMs: fetchResult.responseTimeMs,
    isHttps: fetchResult.finalUrl.startsWith("https:"),
  });

  const enriched = enrichFindings(findings);
  const category_scores = buildCategoryScores(enriched);
  const overall_score = calculateOverallScore(category_scores);
  const growth_opportunity = growthOpportunityLabel(overall_score);
  const roadmap = roadmapBuckets(enriched);

  const critical_count = enriched.filter((f) => f.severity === "critical").length;
  const quick_wins = enriched.filter((f) => f.estimated_effort === "low").length;

  let saved = null;
  await updateStore((store) => {
    store.ux_audits = store.ux_audits || [];
    const id = nextId(store.ux_audits);
    const access_token = randomUUID();
    const entry = {
      id,
      access_token,
      website_url: payload.website_url,
      normalized_url: fetchResult.finalUrl,
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
      overall_score,
      growth_opportunity,
      category_scores,
      findings: enriched,
      roadmap,
      summary: {
        critical_issues: critical_count,
        improvement_opportunities: enriched.length,
        quick_wins,
        response_time_ms: fetchResult.responseTimeMs,
        http_status: fetchResult.status,
      },
      limitations: SCAN_LIMITATIONS,
      scan_version: SCAN_VERSION,
      failure_reason: null,
      submitted_at: nowIso(),
      completed_at: nowIso(),
      created_by_user_id: payload.created_by_user_id || null,
      lead: null,
      lead_status: "new",
      internal_notes: "",
      source: payload.source || "ux-audit",
      campaign: payload.campaign || null,
      submitter_ip_hash: meta.ipHash || null,
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
    submitted_at: audit.submitted_at,
    completed_at: audit.completed_at,
    failure_reason: audit.failure_reason,
    has_lead: Boolean(audit.lead),
  };
}
