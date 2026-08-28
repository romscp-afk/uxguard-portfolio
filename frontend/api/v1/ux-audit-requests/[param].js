import { requireAuthUser } from "../../_lib/auth.js";
import { isAdmin } from "../../_lib/roles.js";
import { withApi } from "../../_lib/withApi.js";
import { getAuditById, getAuditByToken, rerunUxAudit, updateUxAuditAdmin } from "../../_lib/ux-audit/store.js";

function parseId(req) {
  const raw = req.query?.param ?? req.query?.id;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  if (fromQuery != null && /^\d+$/.test(String(fromQuery))) return Number(fromQuery);
  const path = String(req.url || "").split("?")[0];
  const match = path.match(/\/ux-audit-requests\/(\d+)(?:\/)?$/);
  return match ? Number(match[1]) : NaN;
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
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) {
    res.status(403).json({ detail: "Admin access required." });
    return;
  }

  const id = parseId(req);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ detail: "Invalid audit id." });
    return;
  }

  if (req.method === "GET") {
    const audit = await getAuditById(id);
    if (!audit) {
      res.status(404).json({ detail: "Audit not found." });
      return;
    }
    res.status(200).json({ audit });
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    if (body.action === "rerun") {
      try {
        const updated = await rerunUxAudit(id, {
          fetchOptions: process.env.UXGUARD_TEST === "1" ? { skipDns: true } : {},
        });
        res.status(200).json({ audit: updated });
      } catch (err) {
        res.status(err.status || 422).json({ detail: err.message || "Could not re-run audit." });
      }
      return;
    }
    res.status(400).json({ detail: "Unsupported action." });
    return;
  }

  if (req.method === "PATCH") {
    const body = await readBody(req);
    const updated = await updateUxAuditAdmin(id, {
      lead_status: body.lead_status,
      internal_notes: body.internal_notes,
    });
    if (!updated) {
      res.status(404).json({ detail: "Audit not found." });
      return;
    }
    res.status(200).json({ audit: updated });
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
