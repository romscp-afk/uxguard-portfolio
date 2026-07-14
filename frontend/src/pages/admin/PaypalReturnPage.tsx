import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { trackBillingEvent } from "../../lib/analytics";

/** Captures a PayPal order after the buyer returns from PayPal approval. */
export function PaypalReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const orderId = params.get("token") || params.get("orderId") || "";
    const planCode = params.get("plan") || "professional";
    const billingInterval = params.get("interval") === "year" ? "year" : "month";

    if (!orderId) {
      setError("Missing PayPal order id. Please start checkout again.");
      return;
    }

    let cancelled = false;

    async function finish() {
      try {
        const result = await api.completePaypalCheckout({
          orderId,
          planCode,
          billingInterval,
        });
        if (cancelled) return;
        trackBillingEvent("checkout_completed", {
          plan: planCode,
          interval: billingInterval,
          provider: "paypal",
        });
        navigate("/checkout/success", {
          replace: true,
          state: { summary: result.current },
        });
      } catch (err) {
        if (cancelled) return;
        trackBillingEvent("checkout_failed", { plan: planCode, interval: billingInterval, provider: "paypal" });
        setError(err instanceof ApiError ? err.message : "PayPal payment could not be completed.");
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-950">PayPal checkout issue</h1>
          <p className="mt-3 text-sm text-ink-600">{error}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/upgrade" className="btn-primary">
              Try again
            </Link>
            <Link to="/admin/billing" className="btn-secondary">
              Billing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <h1 className="font-display text-2xl font-bold text-ink-950">Confirming PayPal payment…</h1>
        <p className="text-sm text-ink-500">Please wait while we activate your plan.</p>
      </div>
    </div>
  );
}
