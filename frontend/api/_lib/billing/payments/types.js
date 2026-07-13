/**
 * Shared payment provider contracts.
 * @typedef {'month' | 'year'} BillingInterval
 * @typedef {'succeeded' | 'failed' | 'cancelled'} MockCheckoutOutcome
 *
 * @typedef {object} CheckoutSession
 * @property {string} provider
 * @property {string} sessionId
 * @property {string} planCode
 * @property {BillingInterval} billingInterval
 * @property {number|null} amount
 * @property {string} currency
 * @property {string} checkoutUrl
 *
 * @typedef {object} PaymentProvider
 * @property {string} name
 * @property {(args: object) => Promise<CheckoutSession>} createCheckoutSession
 * @property {(args: object) => Promise<object>} [completeMockCheckout]
 * @property {(args: object) => object} [createCustomerPortalSession]
 * @property {(args: object) => Promise<object>} [cancelSubscription]
 * @property {(args: object) => Promise<object>} [resumeSubscription]
 * @property {(args: object) => Promise<object>} [getSubscription]
 * @property {(args: object) => Promise<object>} [handleWebhook]
 * @property {(args: object) => Promise<object[]>} [getInvoiceHistory]
 */

export {};
