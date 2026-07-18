import { requireAuthUser } from "../../../../_lib/auth.js";
import { withApi } from "../../../../_lib/withApi.js";
import { isAdmin } from "../../../../_lib/roles.js";
import { adminGetEmployer, adminVerifyEmployer } from "../../../../_lib/admin-employers.js";

function companyIdFrom(req) {
  if (req.query?.companyId != null) return req.query.companyId;
  if (req.query?.id != null) return req.query.id;
  if (req.query?.param != null) return req.query.param;
  const match = String(req.url || "").match(/\/admin\/employers\/([^/?#]+)/);
  return match?.[1] || null;
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

  const companyId = companyIdFrom(req);
  if (!companyId) {
    res.status(400).json({ detail: "companyId required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const detail = await adminGetEmployer(companyId);
      if (!detail) {
        res.status(404).json({ detail: "Employer not found" });
        return;
      }
      res.status(200).json(detail);
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  if (req.method === "PATCH" || req.method === "POST") {
    try {
      const body = await readBody(req);
      const company = await adminVerifyEmployer(
        companyId,
        user,
        body.status || body.verification_status,
        body.note || body.moderation_note || "",
      );
      res.status(200).json({ company });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
