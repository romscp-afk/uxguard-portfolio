import { requireAuthUser } from "../../_lib/auth.js";
import { getUsageSummary } from "../../_lib/billing/entitlements.js";
import {
  listTransactions,
  scheduleCancellation,
  resumeSubscription,
  ensureFreeSubscription,
} from "../../_lib/billing/persistence.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  const user = await requireAuthUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    try {
      await ensureFreeSubscription(user.id);
      const summary = await getUsageSummary(user.id);
      const transactions = await listTransactions(user.id);
      res.status(200).json({ ...summary, transactions });
    } catch (err) {
      res.status(500).json({ detail: err.message || "Could not load subscription" });
    }
    return;
  }

  if (req.method === "POST") {
    const action = req.body?.action;
    try {
      if (action === "cancel") {
        const sub = await scheduleCancellation(user.id);
        const summary = await getUsageSummary(user.id);
        res.status(200).json({ subscription: sub, ...summary });
        return;
      }
      if (action === "resume") {
        const sub = await resumeSubscription(user.id);
        const summary = await getUsageSummary(user.id);
        res.status(200).json({ subscription: sub, ...summary });
        return;
      }
      res.status(400).json({ detail: "Unknown action" });
    } catch (err) {
      res.status(err.status || 500).json({ detail: err.message || "Subscription update failed" });
    }
    return;
  }

  res.status(405).json({ detail: "Method not allowed" });
});
