import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { PlanSummaryCard } from "../../components/billing/PlanSummaryCard";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { trackBillingEvent } from "../../lib/analytics";
import type { BillingUsageSummary } from "../../types";

export function BillingSettingsPage() {
  const [summary, setSummary] = useState<BillingUsageSummary | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.getBillingSubscription();
      setSummary(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load billing.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel() {
    if (!window.confirm("Cancel at period end? You keep paid access until the renewal date.")) return;
    setBusy(true);
    setError("");
    try {
      const data = await api.cancelSubscription();
      setSummary(data);
      setMessage("Cancellation scheduled. Paid features remain until the period ends.");
      trackBillingEvent("subscription_cancelled");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel.");
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true);
    setError("");
    try {
      const data = await api.resumeSubscription();
      setSummary(data);
      setMessage("Subscription resumed.");
      trackBillingEvent("subscription_resumed");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resume.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ReadOnlyNotice />
      <h1 className="font-display text-3xl font-bold text-ink-950">Billing</h1>
      <p className="mt-1 text-ink-500">Manage your UXGuard plan, usage, and invoices.</p>

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {summary ? <PlanSummaryCard summary={summary} /> : <div className="card h-64 animate-pulse bg-ink-100" />}

        <div className="card space-y-4 p-6">
          <h2 className="font-semibold text-ink-900">Subscription actions</h2>
          {summary?.plan.code === "free" ? (
            <p className="text-sm text-ink-600">No payment method is required for your current plan.</p>
          ) : (
            <p className="text-sm text-ink-600">
              Provider: {summary?.subscription.payment_provider || "—"}
            </p>
          )}
          <EditGuard>
            <div className="flex flex-wrap gap-2">
              <Link to="/upgrade" className="btn-primary">
                {summary?.plan.code === "free" ? "Upgrade" : "Change plan"}
              </Link>
              {summary?.subscription.status === "canceling" ? (
                <button type="button" className="btn-secondary" disabled={busy} onClick={resume}>
                  Resume subscription
                </button>
              ) : summary?.plan.code !== "free" ? (
                <button type="button" className="btn-secondary" disabled={busy} onClick={cancel}>
                  Cancel at period end
                </button>
              ) : null}
            </div>
          </EditGuard>
        </div>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="font-semibold text-ink-900">Billing history</h2>
        {!summary?.transactions?.length ? (
          <p className="mt-3 text-sm text-ink-500">No invoices yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {summary.transactions.map((txn) => (
              <li key={txn.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink-800">
                    {txn.currency} {txn.amount} · {txn.status}
                  </p>
                  <p className="text-xs text-ink-400">{new Date(txn.created_at).toLocaleString()}</p>
                </div>
                {txn.invoice_url || txn.receipt_url ? (
                  <a
                    href={txn.invoice_url || txn.receipt_url || "#"}
                    className="text-brand-600"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
