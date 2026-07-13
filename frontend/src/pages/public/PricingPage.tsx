import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, HelpCircle } from "lucide-react";
import { api } from "../../api/client";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { useAuth } from "../../context/AuthContext";
import { trackBillingEvent } from "../../lib/analytics";
import type { BillingPlan, BillingUsageSummary } from "../../types";

const FAQS = [
  {
    q: "Do I need a payment method for Free?",
    a: "No. The Free plan never requires a card. Upgrade only when you need more case studies, AI credits, or advanced features.",
  },
  {
    q: "What happens when I hit Free limits?",
    a: "Existing work stays safe. You can keep viewing and editing within limits, and upgrade anytime for unlimited case studies and higher AI allowances.",
  },
  {
    q: "Can I cancel a paid plan?",
    a: "Yes. Paid access continues until the end of the billing period, then you return to Free without deleting your content.",
  },
];

function priceLabel(plan: BillingPlan, annual: boolean) {
  if (plan.code === "enterprise") return "Custom";
  const value = annual ? plan.annual_price : plan.monthly_price;
  if (value == null) return "Custom";
  if (value === 0) return "$0";
  return annual ? `$${value}/yr` : `$${value}/mo`;
}

export function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [current, setCurrent] = useState<BillingUsageSummary | null>(null);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    trackBillingEvent("pricing_page_viewed");
    api
      .listBillingPlans()
      .then((res) => {
        setPlans(res.plans || []);
        if (res.current) setCurrent(res.current);
      })
      .catch(() => setPlans([]));
  }, [user?.id]);

  const ordered = useMemo(
    () =>
      ["free", "professional", "team", "enterprise"]
        .map((code) => plans.find((p) => p.code === code))
        .filter(Boolean) as BillingPlan[],
    [plans],
  );

  return (
    <div className="min-h-screen surface-page">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Pricing</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-ink-950 sm:text-5xl">
            Build, manage and grow your UX career in one intelligent workspace.
          </h1>
          <p className="mt-4 text-lg text-ink-600">
            Start free. Upgrade when you need advanced portfolio tools, AI assistance and professional
            career features.
          </p>
          <div className="mt-8 inline-flex rounded-full border border-ink-200 bg-white p-1">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${!annual ? "bg-brand-600 text-white" : "text-ink-600"}`}
              onClick={() => setAnnual(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${annual ? "bg-brand-600 text-white" : "text-ink-600"}`}
              onClick={() => setAnnual(true)}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {ordered.map((plan) => {
            const isCurrent = current?.plan.code === plan.code;
            const recommended = plan.highlight;
            return (
              <div
                key={plan.code}
                className={`card relative flex flex-col p-6 ${
                  recommended ? "border-brand-400 ring-2 ring-brand-200" : ""
                }`}
              >
                {recommended ? (
                  <span className="absolute -top-3 left-4 rounded-full bg-brand-600 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Recommended
                  </span>
                ) : null}
                <h2 className="font-display text-xl font-bold text-ink-950">{plan.name}</h2>
                <p className="mt-2 text-3xl font-bold text-ink-950">{priceLabel(plan, annual)}</p>
                <p className="mt-2 text-sm text-ink-500">{plan.description}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-700">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {plan.case_study_limit == null
                      ? "Unlimited case studies"
                      : `Up to ${plan.case_study_limit} case studies`}
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {plan.ai_credits == null ? "Custom AI credits" : `${plan.ai_credits} AI credits / month`}
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {plan.custom_domain_enabled ? "Custom domain" : "Public portfolio page"}
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {plan.team_workspace_enabled ? "Team workspace" : "Solo workspace"}
                  </li>
                </ul>
                <div className="mt-6">
                  {plan.code === "enterprise" ? (
                    <a href="/contact" className="btn-secondary w-full">
                      Contact sales
                    </a>
                  ) : plan.code === "free" ? (
                    <Link
                      to={user ? "/admin" : "/admin/register"}
                      className="btn-secondary w-full"
                    >
                      {isCurrent ? "Current plan" : "Start free"}
                    </Link>
                  ) : (
                    <Link
                      to={user ? `/upgrade?plan=${plan.code}&interval=${annual ? "year" : "month"}` : "/admin/register"}
                      className={`w-full ${recommended ? "btn-primary" : "btn-secondary"}`}
                    >
                      {isCurrent ? "Current plan" : "Upgrade"}
                    </Link>
                  )}
                </div>
                {plan.code === "free" ? (
                  <p className="mt-3 text-center text-[11px] text-ink-400">No payment method required</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-ink-950">Frequently asked questions</h2>
          <div className="mt-6 space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="card p-5">
                <p className="flex items-start gap-2 font-medium text-ink-900">
                  <HelpCircle className="mt-0.5 h-4 w-4 text-brand-600" />
                  {faq.q}
                </p>
                <p className="mt-2 text-sm text-ink-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
