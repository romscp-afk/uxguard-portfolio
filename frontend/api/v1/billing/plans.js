import { requireAuthUser } from "../../_lib/auth.js";
import { getActivePlans } from "../../_lib/billing/plans.js";
import { getUsageSummary } from "../../_lib/billing/entitlements.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const plans = getActivePlans().map((p) => ({
    code: p.code,
    name: p.name,
    description: p.description,
    monthly_price: p.monthly_price,
    annual_price: p.annual_price,
    currency: p.currency,
    ai_credits: p.ai_credits,
    storage_limit_bytes: p.storage_limit_bytes,
    portfolio_limit: p.portfolio_limit,
    case_study_limit: p.case_study_limit,
    team_member_limit: p.team_member_limit,
    custom_domain_enabled: p.custom_domain_enabled,
    private_projects_enabled: p.private_projects_enabled,
    advanced_analytics_enabled: p.advanced_analytics_enabled,
    pdf_export_enabled: p.pdf_export_enabled,
    team_workspace_enabled: p.team_workspace_enabled,
    ai_tools_enabled: p.ai_tools_enabled,
    interview_prep_enabled: p.interview_prep_enabled,
    highlight: Boolean(p.highlight),
  }));

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(200).json({ plans });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    const summary = await getUsageSummary(user.id);
    res.status(200).json({ plans, current: summary });
  } catch (err) {
    res.status(200).json({ plans });
  }
});
