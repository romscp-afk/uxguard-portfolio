import { requireAuthUser } from "../../../_lib/auth.js";
import { withApi } from "../../../_lib/withApi.js";
import { getEmployerDashboard } from "../../../_lib/hiring/companies.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const dashboard = await getEmployerDashboard(user);
  res.status(200).json(dashboard);
});
