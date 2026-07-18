import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { isAdmin } from "../../../_lib/roles.js";
import {
  adminListEmployers,
  adminListPendingEmployerAccounts,
} from "../../../_lib/admin-employers.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (!isAdmin(user)) {
    res.status(403).json({ detail: "Admin access required." });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  try {
    const status = Array.isArray(req.query?.status) ? req.query.status[0] : req.query?.status;
    const [allCompanies, pending_accounts] = await Promise.all([
      adminListEmployers({ status: "all" }),
      adminListPendingEmployerAccounts(),
    ]);
    const companies =
      status && status !== "all"
        ? allCompanies.filter((c) => c.verification_status === status)
        : allCompanies;
    const counts = {
      all: allCompanies.length,
      pending: allCompanies.filter((c) => c.verification_status === "pending").length,
      verified: allCompanies.filter((c) => c.verification_status === "verified").length,
      rejected: allCompanies.filter((c) => c.verification_status === "rejected").length,
      suspended: allCompanies.filter((c) => c.verification_status === "suspended").length,
      awaiting_profile: pending_accounts.length,
    };
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ companies, pending_accounts, counts });
  } catch (err) {
    res.status(500).json({ detail: err.message || "Could not load employers" });
  }
});
