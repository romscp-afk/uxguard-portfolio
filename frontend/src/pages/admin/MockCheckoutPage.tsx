import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { trackBillingEvent } from "../../lib/analytics";

export function MockCheckoutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = params.get("plan") || "professional";
  const interval = params.get("interval") === "year" ? "year" : "month";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) navigate("/admin/login");
  }, [user, navigate]);

  async function finish(outcome: "succeeded" | "failed" | "cancelled") {
    setBusy(true);
    setError("");
    try {
      const result = await api.completeMockCheckout({
        planCode: plan,
        billingInterval: interval,
        outcome,
      });
      if (result.success) {
        trackBillingEvent("checkout_completed", { plan, interval, provider: "mock" });
        trackBillingEvent("upgrade_successful", { plan });
        navigate("/checkout/success", { replace: true, state: { summary: result.current } });
      } else {
        trackBillingEvent(outcome === "cancelled" ? "checkout_cancelled" : "checkout_failed", {
          plan,
          interval,
        });
        navigate("/checkout/cancelled", { replace: true, state: { detail: result.detail } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="card p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Mock payment</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink-950">Simulate checkout</h1>
        <p className="mt-2 text-sm text-ink-600">
          Plan: <strong>{plan}</strong> · Interval: <strong>{interval}</strong>
        </p>
        <p className="mt-2 text-sm text-ink-500">
          No real money is processed. Use these outcomes to test subscription activation.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" className="btn-primary" disabled={busy} onClick={() => finish("succeeded")}>
            Simulate successful payment
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => finish("failed")}>
            Simulate failed payment
          </button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => finish("cancelled")}>
            Simulate cancelled payment
          </button>
          <Link to="/upgrade" className="text-center text-sm text-brand-600">
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}
