import { requireAuthUser } from "../../_lib/auth.js";
import { withApi } from "../../_lib/withApi.js";
import { readBody } from "../../_lib/hiring/http.js";
import {
  createCompany,
  listCompaniesForUser,
  getEmployerDashboard,
} from "../../_lib/hiring/companies.js";
import { trackHiringEvent } from "../../_lib/hiring/analytics.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const companies = await listCompaniesForUser(user.id);
    const dashboard = await getEmployerDashboard(user);
    res.status(200).json({ companies, dashboard });
    return;
  }

  if (req.method === "POST") {
    try {
      await trackHiringEvent("employer_onboarding_started", user.id, {});
      const company = await createCompany(user, await readBody(req));
      res.status(201).json({ company });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Failed to create company" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
