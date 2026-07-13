/**
 * Stripe-ready stub. Requires PAYMENT_PROVIDER=stripe and Stripe env vars.
 * Do not process real charges until mock lifecycle tests pass.
 */

function notConfigured(message) {
  const error = new Error(message);
  error.status = 501;
  error.code = "stripe_not_configured";
  throw error;
}

export function createStripeProvider() {
  return {
    name: "stripe",
    async createCheckoutSession() {
      if (!process.env.STRIPE_SECRET_KEY) {
        notConfigured("STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe.");
      }
      notConfigured(
        "Stripe checkout is prepared but not fully wired. Set PAYMENT_PROVIDER=mock for local upgrades.",
      );
    },
    async createCustomerPortalSession() {
      notConfigured("Stripe customer portal is not configured yet.");
    },
    async cancelSubscription() {
      notConfigured("Stripe cancel is not configured yet.");
    },
    async resumeSubscription() {
      notConfigured("Stripe resume is not configured yet.");
    },
    async getSubscription() {
      notConfigured("Stripe getSubscription is not configured yet.");
    },
    async handleWebhook() {
      notConfigured("Stripe webhooks are not configured yet.");
    },
    async getInvoiceHistory() {
      notConfigured("Stripe invoice history is not configured yet.");
    },
  };
}
