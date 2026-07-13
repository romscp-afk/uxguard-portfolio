import { withApi } from "../../_lib/withApi.js";

/**
 * Stripe webhook stub — verifies signature when Stripe is configured.
 * With PAYMENT_PROVIDER=mock this endpoint returns 501.
 */
export default withApi(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const provider = String(process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (provider !== "stripe") {
    res.status(501).json({
      detail: "Webhook handler reserved for Stripe. Use mock checkout in development.",
    });
    return;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ detail: "STRIPE_WEBHOOK_SECRET is not configured." });
    return;
  }

  // Signature verification and idempotent event processing will be implemented
  // when Stripe price IDs and keys are provisioned.
  res.status(501).json({ detail: "Stripe webhook processing is prepared but not fully wired yet." });
});
