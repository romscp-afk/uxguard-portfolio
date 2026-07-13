import { requireAuthUser } from "../../_lib/auth.js";
import { assertCanEdit } from "../../_lib/projects.js";
import {
  createCheckoutSession,
  completeMockCheckout,
  createCustomerPortalSession,
} from "../../_lib/billing/payments.js";
import { getUsageSummary } from "../../_lib/billing/entitlements.js";
import { withApi } from "../../_lib/withApi.js";

function originFromReq(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5174";
  return `${proto}://${host}`;
}

export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const user = await requireAuthUser(req, res);
  if (!user) return;

  try {
    assertCanEdit(user);
  } catch (err) {
    res.status(err.status || 403).json({ detail: err.message });
    return;
  }

  const body = req.body || {};
  const action = body.action || "checkout";
  const origin = body.origin || originFromReq(req);

  try {
    if (action === "checkout") {
      const session = await createCheckoutSession({
        userId: user.id,
        planCode: body.planCode,
        billingInterval: body.billingInterval === "year" ? "year" : "month",
        origin,
      });
      res.status(200).json(session);
      return;
    }

    if (action === "complete_mock") {
      const result = await completeMockCheckout({
        userId: user.id,
        planCode: body.planCode,
        billingInterval: body.billingInterval === "year" ? "year" : "month",
        outcome: body.outcome || "succeeded",
      });
      const summary = result.success ? await getUsageSummary(user.id) : null;
      res.status(200).json({ ...result, current: summary });
      return;
    }

    if (action === "portal") {
      const portal = createCustomerPortalSession({ origin });
      res.status(200).json(portal);
      return;
    }

    res.status(400).json({ detail: "Unknown checkout action" });
  } catch (err) {
    res.status(err.status || 500).json({ detail: err.message || "Checkout failed", code: err.code });
  }
});
