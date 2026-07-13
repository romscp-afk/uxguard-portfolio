import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api } from "../../api/client";
import { PlanSummaryCard } from "../../components/billing/PlanSummaryCard";
import type { BillingUsageSummary } from "../../types";

export function CheckoutSuccessPage() {
  const location = useLocation();
  const [summary, setSummary] = useState<BillingUsageSummary | null>(
    (location.state as { summary?: BillingUsageSummary } | null)?.summary || null,
  );

  useEffect(() => {
    api
      .getBillingSubscription()
      .then(setSummary)
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-start gap-3">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Upgrade successful</h1>
          <p className="mt-1 text-ink-500">
            Your entitlements were verified from the server — not from the URL alone.
          </p>
        </div>
      </div>
      {summary ? <PlanSummaryCard summary={summary} /> : <div className="card h-40 animate-pulse bg-ink-100" />}
      <div className="mt-6 flex gap-2">
        <Link to="/admin" className="btn-primary">
          Go to dashboard
        </Link>
        <Link to="/admin/billing" className="btn-secondary">
          Billing settings
        </Link>
      </div>
    </div>
  );
}

export function CheckoutCancelledPage() {
  const location = useLocation();
  const detail =
    (location.state as { detail?: string } | null)?.detail ||
    "Checkout was cancelled. Your previous plan is unchanged.";

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-ink-950">Checkout cancelled</h1>
        <p className="mt-3 text-sm text-ink-600">{detail}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/upgrade" className="btn-primary">
            Try again
          </Link>
          <Link to="/pricing" className="btn-secondary">
            View plans
          </Link>
        </div>
      </div>
    </div>
  );
}
