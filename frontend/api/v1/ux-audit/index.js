import { isPersistentStoreEnabled } from "../../_lib/store.js";
import { withApi } from "../../_lib/withApi.js";
import { assertUxAuditRateLimit } from "../../_lib/ux-audit/rate-limit.js";
import {
  hashIp,
  publicAuditView,
  runUxAudit,
  saveAuditFailure,
} from "../../_lib/ux-audit/store.js";
import { viewerKeyFromRequest } from "../../_lib/analytics.js";

export const maxDuration = 60;

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString("utf8"));
    } catch {
      return {};
    }
  }
  return {};
}

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const body = await readBody(req);
  const honeypot = String(body.uxg_hp || "").trim();
  if (honeypot) {
    res.status(200).json({ message: "Audit queued." });
    return;
  }

  if (!isPersistentStoreEnabled()) {
    res.status(503).json({
      detail:
        "Audit storage is not configured. Add BLOB_READ_WRITE_TOKEN to the deployment environment.",
    });
    return;
  }

  try {
    assertUxAuditRateLimit(req);
  } catch (err) {
    res.status(err.status || 429).json({ detail: err.message });
    return;
  }

  const payload = {
    website_url: String(body.website_url || "").trim(),
    page_type: String(body.page_type || "").trim() || null,
    primary_goal: String(body.primary_goal || "").trim() || null,
    primary_audience: String(body.primary_audience || "").trim() || null,
    company_name: String(body.company_name || "").trim() || null,
    industry: String(body.industry || "").trim() || null,
    main_concern: String(body.main_concern || "").trim() || null,
    monthly_traffic_range: String(body.monthly_traffic_range || "").trim() || null,
    current_conversion_rate: String(body.current_conversion_rate || "").trim() || null,
    target_action: String(body.target_action || "").trim() || null,
    concerns: Array.isArray(body.concerns) ? body.concerns.map(String).slice(0, 12) : [],
    source: String(body.source || "ux-audit").slice(0, 40),
    campaign: body.campaign ? String(body.campaign).slice(0, 80) : null,
  };

  if (!payload.website_url) {
    res.status(400).json({ detail: "Website URL is required." });
    return;
  }

  const ipHash = hashIp(viewerKeyFromRequest(req));

  try {
    const audit = await runUxAudit(payload, {
      ipHash,
      fetchOptions: process.env.UXGUARD_TEST === "1" ? { skipDns: true } : {},
    });
    res.status(201).json({
      audit: publicAuditView(audit),
      results_url: `/ux-audit/results/${audit.access_token}`,
    });
  } catch (err) {
    try {
      const failed = await saveAuditFailure(payload, err.message || "Scan failed", { ipHash });
      res.status(201).json({
        detail: err.message || "Could not complete the audit.",
        audit: publicAuditView(failed),
        results_url: failed ? `/ux-audit/results/${failed.access_token}` : null,
      });
    } catch (saveErr) {
      res.status(422).json({
        detail: err.message || "Could not complete the audit.",
        save_error: saveErr.message || "Could not save audit failure record.",
      });
    }
  }
});
