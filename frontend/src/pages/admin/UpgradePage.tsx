import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { useAuth } from "../../context/AuthContext";
import { trackBillingEvent } from "../../lib/analytics";
import { FREE_UNTIL_NOTE, PAID_CHECKOUT_ENABLED, PAID_CHECKOUT_PAUSED_DETAIL } from "../../lib/billingLaunch";

export function UpgradePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [planCode, setPlanCode] = useState(params.get("plan") || "professional");
  const [interval, setInterval] = useState<"month" | "year">(
    params.get("interval") === "year" ? "year" : "month",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) navigate("/admin/login", { state: { from: "/upgrade" } });
  }, [user, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!PAID_CHECKOUT_ENABLED) {
      setError(PAID_CHECKOUT_PAUSED_DETAIL);
      return;
    }
    setBusy(true);
    setError("");
    try {
      trackBillingEvent("plan_selected", { plan: planCode, interval });
      trackBillingEvent("checkout_started", { plan: planCode, interval });
      const session = await api.startCheckout({
        planCode,
        billingInterval: interval,
        origin: window.location.origin,
      });
      window.location.href = session.checkoutUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <ReadOnlyNotice />
      <h1 className="font-display text-3xl font-bold text-ink-950">Upgrade your plan</h1>
      <p className="mt-2 text-ink-500">
        {PAID_CHECKOUT_ENABLED
          ? "Choose Professional or Team. Checkout uses your configured payment provider (mock locally, PayPal or Stripe when credentials are set)."
          : PAID_CHECKOUT_PAUSED_DETAIL}
      </p>

      {!PAID_CHECKOUT_ENABLED ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          {FREE_UNTIL_NOTE}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6">
        <fieldset disabled={!PAID_CHECKOUT_ENABLED}>
          <legend className="text-sm font-semibold text-ink-900">Plan</legend>
          <div className="mt-3 space-y-2">
            {[
              { code: "professional", label: "Professional — $15/mo or $165/yr (11 months)" },
              { code: "team", label: "Team — $39/mo or $429/yr (11 months)" },
            ].map((opt) => (
              <label key={opt.code} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-3">
                <input
                  type="radio"
                  name="plan"
                  checked={planCode === opt.code}
                  onChange={() => setPlanCode(opt.code)}
                  disabled={!PAID_CHECKOUT_ENABLED}
                />
                <span className="text-sm text-ink-800">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={!PAID_CHECKOUT_ENABLED}>
          <legend className="text-sm font-semibold text-ink-900">Billing interval</legend>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${interval === "month" ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"}`}
              onClick={() => setInterval("month")}
              disabled={!PAID_CHECKOUT_ENABLED}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium ${interval === "year" ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-700"}`}
              onClick={() => setInterval("year")}
              disabled={!PAID_CHECKOUT_ENABLED}
            >
              Annual
            </button>
          </div>
        </fieldset>

        <EditGuard>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={busy || !PAID_CHECKOUT_ENABLED}
          >
            {PAID_CHECKOUT_ENABLED
              ? busy
                ? "Starting checkout…"
                : "Continue to checkout"
              : "Checkout unavailable"}
          </button>
        </EditGuard>
        <Link to="/pricing" className="block text-center text-sm text-brand-600">
          Back to pricing
        </Link>
      </form>
    </div>
  );
}
