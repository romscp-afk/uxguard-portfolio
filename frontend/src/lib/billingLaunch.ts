/**
 * Temporary launch gate: paid checkout is paused while PayPal Live is finalized.
 * Flip PAID_CHECKOUT_ENABLED to true when ready to take payments again.
 */
export const PAID_CHECKOUT_ENABLED = false;

/** Public-facing free promo end date (inclusive messaging). */
export const FREE_UNTIL_DATE_LABEL = "September 30, 2026";

export const FREE_UNTIL_NOTE = `Free until ${FREE_UNTIL_DATE_LABEL}.`;

export const PAID_CHECKOUT_PAUSED_DETAIL =
  `Paid upgrades are temporarily unavailable. UXGuard is free until ${FREE_UNTIL_DATE_LABEL}.`;
