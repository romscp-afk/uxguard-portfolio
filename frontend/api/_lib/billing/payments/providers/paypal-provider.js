/**
 * PayPal Checkout (Orders v2) provider.
 *
 * Env:
 * - PAYPAL_CLIENT_ID
 * - PAYPAL_CLIENT_SECRET
 * - PAYPAL_MODE=sandbox|live (default sandbox)
 *
 * Merchant account linked to these API credentials receives payment
 * (Business account for romscp@gmail.com — do not put the email in checkout calls).
 */

import { getPlanByCode, PLAN_CODES } from "../../plans.js";
import { activatePaidPlan, findPaymentTransactionByProviderId } from "../../persistence.js";

function paypalBaseUrl() {
  const mode = String(process.env.PAYPAL_MODE || "sandbox").toLowerCase();
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function notConfigured(message, code = "paypal_not_configured") {
  const error = new Error(message);
  error.status = 503;
  error.code = code;
  throw error;
}

function apiError(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}

/** @param {string|null|undefined} customId */
function parseCustomId(customId) {
  const raw = String(customId || "").trim();
  if (!raw) return null;
  const parts = Object.fromEntries(
    raw.split("|").map((part) => {
      const idx = part.indexOf(":");
      if (idx < 0) return [part, ""];
      return [part.slice(0, idx), part.slice(idx + 1)];
    }),
  );
  const userId = Number(parts.uid);
  const planCode = String(parts.plan || "").toLowerCase();
  const billingInterval = parts.interval === "year" ? "year" : parts.interval === "month" ? "month" : null;
  if (!Number.isFinite(userId) || userId <= 0 || !planCode || !billingInterval) return null;
  return { userId, planCode, billingInterval };
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    notConfigured(
      "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox or live).",
    );
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    apiError(`PayPal auth failed (${res.status}). ${text.slice(0, 200)}`, 502, "paypal_auth_failed");
  }

  const data = await res.json();
  return data.access_token;
}

async function fetchOrder(token, orderId) {
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      payload?.message ||
      payload?.details?.[0]?.description ||
      `PayPal order lookup failed (${res.status}).`;
    apiError(detail, 502, "paypal_order_lookup_failed");
  }
  return payload;
}

function extractPurchaseMeta(order) {
  const unit = order?.purchase_units?.[0] || {};
  const capture = unit?.payments?.captures?.[0] || null;
  const amountValue = Number(capture?.amount?.value ?? unit?.amount?.value);
  const currency = String(capture?.amount?.currency_code || unit?.amount?.currency_code || "USD");
  const custom = parseCustomId(unit.custom_id);
  const captureId = capture?.id ? String(capture.id) : null;
  const captureStatus = String(capture?.status || "").toUpperCase();
  return { unit, capture, amountValue, currency, custom, captureId, captureStatus };
}

function assertOrderMatchesUser(order, userId) {
  const meta = extractPurchaseMeta(order);
  if (!meta.custom) {
    apiError("PayPal order is missing checkout metadata.", 400, "paypal_missing_custom_id");
  }
  if (Number(meta.custom.userId) !== Number(userId)) {
    apiError("PayPal order does not belong to this account.", 403, "paypal_user_mismatch");
  }

  const plan = getPlanByCode(meta.custom.planCode);
  if (!plan || plan.code === PLAN_CODES.FREE || plan.code === PLAN_CODES.ENTERPRISE) {
    apiError("PayPal order references an invalid plan.", 400, "paypal_invalid_plan");
  }

  const expectedAmount =
    meta.custom.billingInterval === "year" ? plan.annual_price : plan.monthly_price;
  if (!Number.isFinite(meta.amountValue) || Math.abs(meta.amountValue - Number(expectedAmount)) > 0.009) {
    apiError("PayPal order amount does not match the selected plan.", 402, "paypal_amount_mismatch");
  }

  return { ...meta, plan, expectedAmount };
}

export function createPayPalProvider() {
  return {
    name: "paypal",

    async createCheckoutSession({ userId, planCode, billingInterval, origin }) {
      const plan = getPlanByCode(planCode);
      if (!plan || plan.code === PLAN_CODES.FREE || plan.code === PLAN_CODES.ENTERPRISE) {
        apiError("Select Professional or Team to upgrade.", 400, "invalid_plan");
      }

      const amount = billingInterval === "year" ? plan.annual_price : plan.monthly_price;
      if (!Number.isFinite(amount) || amount <= 0) {
        apiError("Invalid plan price for PayPal checkout.", 400, "invalid_amount");
      }

      const token = await getAccessToken();
      // plan/interval in return URL are for UX only — activation trusts order custom_id.
      const returnUrl = `${origin}/checkout/paypal/return`;
      const cancelUrl = `${origin}/checkout/cancelled`;

      const orderRes = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: plan.currency || "USD",
                value: Number(amount).toFixed(2),
              },
              description: `UXGuard ${plan.name} (${billingInterval})`,
              custom_id: `uid:${userId}|plan:${plan.code}|interval:${billingInterval}`,
            },
          ],
          application_context: {
            brand_name: "UXGuard Studio",
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      if (!orderRes.ok) {
        const text = await orderRes.text().catch(() => "");
        apiError(`PayPal order failed (${orderRes.status}). ${text.slice(0, 240)}`, 502, "paypal_order_failed");
      }

      const order = await orderRes.json();
      const approve = (order.links || []).find((link) => link.rel === "approve");
      if (!approve?.href) {
        apiError("PayPal did not return an approval URL.", 502, "paypal_missing_approve_url");
      }

      return {
        provider: "paypal",
        sessionId: order.id,
        planCode: plan.code,
        billingInterval,
        amount,
        currency: plan.currency || "USD",
        checkoutUrl: approve.href,
      };
    },

    async completeCheckout({ userId, orderId }) {
      if (!orderId) {
        apiError("Missing PayPal order id.", 400, "paypal_missing_order_id");
      }

      const token = await getAccessToken();
      let order = null;

      const captureRes = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const capturePayload = await captureRes.json().catch(() => ({}));
      if (captureRes.ok) {
        order = capturePayload;
      } else {
        const issue = String(capturePayload?.details?.[0]?.issue || "").toUpperCase();
        // Idempotent: buyer refreshed return URL after a successful capture.
        if (captureRes.status === 422 && issue === "ORDER_ALREADY_CAPTURED") {
          order = await fetchOrder(token, orderId);
        } else {
          const detail =
            capturePayload?.message ||
            capturePayload?.details?.[0]?.description ||
            `PayPal capture failed (${captureRes.status}).`;
          apiError(detail, 402, "paypal_capture_failed");
        }
      }

      const status = String(order?.status || "").toUpperCase();
      if (status !== "COMPLETED") {
        apiError(`PayPal payment status was ${status || "unknown"}.`, 402, "paypal_not_completed");
      }

      const verified = assertOrderMatchesUser(order, userId);
      if (verified.captureStatus && verified.captureStatus !== "COMPLETED") {
        apiError(
          `PayPal capture status was ${verified.captureStatus}.`,
          402,
          "paypal_capture_not_completed",
        );
      }

      const captureId = verified.captureId || String(orderId);

      const existing = await findPaymentTransactionByProviderId("paypal", captureId);
      if (existing) {
        return {
          success: true,
          outcome: "succeeded",
          subscription: existing.subscription || null,
          detail: `Already upgraded to ${verified.custom.planCode} via PayPal.`,
          planCode: verified.custom.planCode,
          billingInterval: verified.custom.billingInterval,
        };
      }

      const sub = await activatePaidPlan({
        userId,
        planCode: verified.custom.planCode,
        billingInterval: verified.custom.billingInterval,
        paymentProvider: "paypal",
        transaction: {
          status: "succeeded",
          provider_transaction_id: captureId,
          amount: verified.expectedAmount,
        },
      });

      return {
        success: true,
        outcome: "succeeded",
        subscription: sub,
        detail: `Upgraded to ${verified.custom.planCode} via PayPal.`,
        planCode: verified.custom.planCode,
        billingInterval: verified.custom.billingInterval,
      };
    },
  };
}
