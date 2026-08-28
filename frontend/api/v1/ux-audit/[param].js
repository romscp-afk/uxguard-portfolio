import { requireAuthUser } from "../../_lib/auth.js";
import { isAdmin } from "../../_lib/roles.js";
import { withApi } from "../../_lib/withApi.js";
import {
  getAuditByToken,
  publicAuditView,
  saveAuditLead,
} from "../../_lib/ux-audit/store.js";

function parseToken(req) {
  const raw = req.query?.param ?? req.query?.token;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery) return String(fromQuery);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/ux-audit\/([^/]+)(?:\/)?$/);
  return match ? match[1] : "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default withApi(async (req, res) => {
  const token = parseToken(req);
  if (!token || token.length < 16) {
    res.status(400).json({ detail: "Invalid audit reference." });
    return;
  }

  if (req.method === "GET") {
    const audit = await getAuditByToken(token);
    if (!audit) {
      res.status(404).json({ detail: "Audit not found." });
      return;
    }
    res.status(200).json({ audit: publicAuditView(audit) });
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    if (body.action !== "lead") {
      res.status(400).json({ detail: "Unsupported action." });
      return;
    }

    const honeypot = String(body.uxg_hp || "").trim();
    if (honeypot) {
      res.status(200).json({ message: "Saved." });
      return;
    }

    const full_name = String(body.full_name || "").trim();
    const business_email = String(body.business_email || "").trim();
    const company_name = String(body.company_name || "").trim();
    const service_consent = Boolean(body.service_consent);
    const marketing_consent = Boolean(body.marketing_consent);

    if (!full_name || !business_email || !company_name) {
      res.status(400).json({ detail: "Name, business email, and company name are required." });
      return;
    }
    if (!isValidEmail(business_email)) {
      res.status(400).json({ detail: "Please enter a valid business email." });
      return;
    }
    if (!service_consent) {
      res.status(400).json({ detail: "Service consent is required to receive your report." });
      return;
    }

    const audit = await getAuditByToken(token);
    if (!audit) {
      res.status(404).json({ detail: "Audit not found." });
      return;
    }

    const updated = await saveAuditLead(token, {
      full_name: full_name.slice(0, 120),
      business_email: business_email.slice(0, 200),
      company_name: company_name.slice(0, 160),
      job_role: String(body.job_role || "").trim().slice(0, 120) || null,
      phone: String(body.phone || "").trim().slice(0, 40) || null,
      service_consent,
      marketing_consent,
      request_type: String(body.request_type || "report").slice(0, 40),
    });

    res.status(200).json({
      message: "Thank you. Your request has been received.",
      audit: publicAuditView(updated),
    });
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});

export async function adminGuard(req, res) {
  const user = await requireAuthUser(req, res);
  if (!user) return null;
  if (!isAdmin(user)) {
    res.status(403).json({ detail: "Admin access required." });
    return null;
  }
  return user;
}
