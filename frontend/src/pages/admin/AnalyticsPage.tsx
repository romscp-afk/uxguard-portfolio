import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Eye,
  FileText,
  Heart,
  Lock,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { AnalyticsSummary, BillingUsageSummary } from "../../types";

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [billing, setBilling] = useState<BillingUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [analytics, sub] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getBillingSubscription().catch(() => null),
        ]);
        if (cancelled) return;
        setSummary(analytics);
        setBilling(sub);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load analytics.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const advancedUnlocked = Boolean(
    billing?.features?.advanced_analytics || billing?.is_admin_comp || billing?.unlimited,
  );

  const maxDayViews = useMemo(() => {
    if (!summary?.views_last_30_days?.length) return 1;
    return Math.max(1, ...summary.views_last_30_days.map((d) => d.views));
  }, [summary]);

  if (!user) return null;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Analytics & Insights</h1>
          <p className="mt-1 text-ink-500">
            Views, likes, and comments across your case studies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            api
              .getAnalyticsSummary()
              .then(setSummary)
              .catch((err) =>
                setError(err instanceof ApiError ? err.message : "Could not refresh."),
              )
              .finally(() => setLoading(false));
          }}
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total views",
            value: summary?.totals.views ?? "—",
            icon: Eye,
            color: "text-brand-600",
          },
          {
            label: "Likes",
            value: summary?.totals.likes ?? "—",
            icon: Heart,
            color: "text-rose-600",
          },
          {
            label: "Comments",
            value: summary?.totals.comments ?? "—",
            icon: MessageCircle,
            color: "text-sky-600",
          },
          {
            label: "Published",
            value: summary?.totals.published_case_studies ?? "—",
            icon: FileText,
            color: "text-emerald-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <Icon className={`h-5 w-5 ${color}`} />
            <p className="mt-3 font-display text-3xl font-bold text-ink-950">{value}</p>
            <p className="text-sm text-ink-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="card mb-8 overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-ink-900">Views · last 30 days</h2>
          </div>
          {!advancedUnlocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
              <Lock className="h-3 w-3" />
              Pro
            </span>
          ) : null}
        </div>

        {advancedUnlocked ? (
          <div className="flex h-40 items-end gap-1">
            {(summary?.views_last_30_days || []).map((day) => (
              <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-brand-500/80"
                  style={{
                    height: `${Math.max(4, Math.round((day.views / maxDayViews) * 100))}%`,
                  }}
                  title={`${day.date}: ${day.views} views`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-6 py-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-brand-500" />
            <p className="mt-3 font-medium text-ink-900">Unlock 30-day view trends</p>
            <p className="mt-1 text-sm text-ink-500">
              Upgrade to Pro for daily view charts and deeper insights.
            </p>
            <Link to="/admin/upgrade" className="btn-primary mt-4 inline-flex">
              Upgrade
            </Link>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-6 py-4">
          <h2 className="font-semibold text-ink-900">Case studies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/50">
              <tr>
                <th className="px-6 py-3 font-semibold text-ink-700">Title</th>
                <th className="px-6 py-3 font-semibold text-ink-700">Status</th>
                <th className="px-6 py-3 font-semibold text-ink-700">Views</th>
                <th className="px-6 py-3 font-semibold text-ink-700">Likes</th>
                <th className="px-6 py-3 font-semibold text-ink-700">Comments</th>
                <th className="px-6 py-3 font-semibold text-ink-700">Last viewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {(summary?.case_studies || []).map((row) => (
                <tr key={row.id} className="hover:bg-ink-50/40">
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/case-studies/${row.id}`}
                      className="font-medium text-ink-900 hover:text-brand-700"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 capitalize text-ink-500">{row.status}</td>
                  <td className="px-6 py-4 text-ink-700">{row.views}</td>
                  <td className="px-6 py-4 text-ink-700">{row.likes}</td>
                  <td className="px-6 py-4 text-ink-700">{row.comments}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-ink-500">
                    {formatWhen(row.last_viewed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && (summary?.case_studies.length || 0) === 0 ? (
          <p className="px-6 py-12 text-center text-ink-500">
            No case studies yet. Publish one to start collecting insights.
          </p>
        ) : null}
      </div>
    </div>
  );
}
