import { Link } from "react-router-dom";
import { ArrowUpRight, CreditCard } from "lucide-react";
import type { BillingUsageSummary } from "../../types";

function Meter({
  label,
  used,
  limit,
  display,
}: {
  label: string;
  used: number;
  limit: number | null;
  display?: string;
}) {
  const unlimited = limit == null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-700">{label}</span>
        <span className="text-ink-500">
          {display || (unlimited ? `${used} · Unlimited` : `${used} of ${limit}`)}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={unlimited ? undefined : pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${display || `${used} of ${limit}`}`}
      >
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-amber-500" : "bg-brand-600"}`}
          style={{ width: unlimited ? "8%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanSummaryCard({ summary }: { summary: BillingUsageSummary }) {
  const { plan, subscription, usage } = summary;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Current plan</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink-950">{plan.name}</h2>
          <p className="mt-1 text-sm capitalize text-ink-500">
            Status: {subscription.status}
            {subscription.billing_interval ? ` · ${subscription.billing_interval}ly` : ""}
          </p>
          {subscription.current_period_end ? (
            <p className="mt-1 text-xs text-ink-400">
              {subscription.cancel_at_period_end ? "Access until" : "Renews"}{" "}
              {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          ) : null}
        </div>
        <CreditCard className="h-8 w-8 text-brand-500" />
      </div>

      <div className="mt-5 space-y-4">
        <Meter
          label="AI credits"
          used={usage.ai_credits_used}
          limit={usage.ai_credits_limit}
          display={
            usage.ai_credits_limit == null
              ? `${usage.ai_credits_used} used · Unlimited`
              : `${usage.ai_credits_used} of ${usage.ai_credits_limit} used`
          }
        />
        <Meter
          label="Case studies"
          used={usage.case_studies_used}
          limit={usage.case_studies_limit}
        />
        <Meter
          label="Storage"
          used={usage.storage_used_bytes}
          limit={usage.storage_limit_bytes}
          display={`${usage.storage_used_label} of ${usage.storage_limit_label}`}
        />
        <Meter label="Portfolios" used={usage.portfolios_used} limit={usage.portfolios_limit} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {plan.code === "free" ? (
          <Link to="/upgrade" className="btn-primary">
            Upgrade
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to="/admin/billing" className="btn-primary">
            Manage subscription
          </Link>
        )}
        <Link to="/pricing" className="btn-secondary">
          View plans
        </Link>
      </div>
    </div>
  );
}
