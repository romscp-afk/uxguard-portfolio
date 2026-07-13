import { createMockPaymentProvider } from "./providers/mock-payment-provider.js";
import { createStripeProvider } from "./providers/stripe-provider.js";

export function getPaymentProvider() {
  const name = String(process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (name === "stripe") return createStripeProvider();
  return createMockPaymentProvider();
}
