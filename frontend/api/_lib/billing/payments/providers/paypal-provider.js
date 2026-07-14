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
import { activatePaidPlan } from "../../persistence.js";

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
    const error = new Error(`PayPal auth failed (${res.status}). ${text.slice(0, 200)}`);
    error.status = 502;
    error.code = "paypal_auth_failed";
    throw error;
  }

  const data = await res.json();
  return data.access_token;
}

export function createPayPalProvider() {
  return {
    name: "paypal",

    async createCheckoutSession({ userId, planCode, billingInterval, origin }) {
      const plan = getPlanByCode(planCode);
      if (!plan || plan.code === PLAN_CODES.FREE || plan.code === PLAN_CODES.ENTERPRISE) {
        const error = new Error("Select Professional or Team to upgrade.");
        error.status = 400;
        throw error;
      }

      const amount = billingInterval === "year" ? plan.annual_price : plan.monthly_price;
      if (!Number.isFinite(amount) || amount <= 0) {
        const error = new Error("Invalid plan price for PayPal checkout.");
        error.status = 400;
        throw error;
      }

      const token = await getAccessToken();
      const returnUrl = `${origin}/checkout/paypal/return?plan=${encodeURIComponent(plan.code)}&interval=${encodeURIComponent(billingInterval)}`;
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
        const error = new Error(`PayPal order failed (${orderRes.status}). ${text.slice(0, 240)}`);
        error.status = 502;
        error.code = "paypal_order_failed";
        throw error;
      }

      const order = await orderRes.json();
      const approve = (order.links || []).find((link) => link.rel === "approve");
      if (!approve?.href) {
        const error = new Error("PayPal did not return an approval URL.");
        error.status = 502;
        error.code = "paypal_missing_approve_url";
        throw error;
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

    async completeCheckout({ userId, orderId, planCode, billingInterval }) {
      if (!orderId) {
        const error = new Error("Missing PayPal order id.");
        error.status = 400;
        throw error;
      }

      const token = await getAccessToken();
      const captureRes = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const payload = await captureRes.json().catch(() => ({}));
      if (!captureRes.ok) {
        const detail =
          payload?.message ||
          payload?.details?.[0]?.description ||
          `PayPal capture failed (${captureRes.status}).`;
        const error = new Error(detail);
        error.status = 402;
        error.code = "paypal_capture_failed";
        throw error;
      }

      const status = String(payload.status || "").toUpperCase();
      if (status !== "COMPLETED" && status !== "APPROVED") {
        // COMPLETED after capture; APPROVED is rare here.
        const error = new Error(`PayPal payment status was ${status || "unknown"}.`);
        error.status = 402;
        error.code = "paypal_not_completed";
        throw error;
      }

      const captureId =
        payload?.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

      const sub = await activatePaidPlan({
        userId,
        planCode,
        billingInterval,
        paymentProvider: "paypal",
        transaction: {
          status: "succeeded",
          provider_transaction_id: String(captureId),
        },
      });

      return {
        success: true,
        outcome: "succeeded",
        subscription: sub,
        detail: `Upgraded to ${planCode} via PayPal.`,
      };
    },
  };
}
