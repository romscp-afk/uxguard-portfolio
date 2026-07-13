/**
 * Compatibility surface for billing checkout routes.
 * Prefer importing from ./payments/provider-factory.js for new code.
 */
export {
  assertMockPaymentsAllowed,
  createCheckoutSession,
  completeMockCheckout,
  createCustomerPortalSession,
  mockPaymentsEnabled,
} from "./payments/providers/mock-payment-provider.js";

export { createStripeProvider as createStripeProviderStub } from "./payments/providers/stripe-provider.js";
export { getPaymentProvider } from "./payments/provider-factory.js";
