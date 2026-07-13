/**
 * PaymentProvider interface documentation + re-exports.
 * Implementations live under ./providers/
 */
export { getPaymentProvider } from "./provider-factory.js";
export {
  assertMockPaymentsAllowed,
  createCheckoutSession,
  completeMockCheckout,
  createCustomerPortalSession,
  createMockPaymentProvider,
  mockPaymentsEnabled,
} from "./providers/mock-payment-provider.js";
export { createStripeProvider } from "./providers/stripe-provider.js";
