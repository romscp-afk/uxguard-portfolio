import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Filter, Zap } from "lucide-react";
import type { UxAuditFinding, UxAuditPublic } from "../../types/ux-audit";
import { UX_AUDIT_CATEGORY_LABELS, severityLabel } from "../../lib/ux-audit";
import { ScoreGauge } from "./ScoreGauge";
import { trackUxAuditEvent } from "../../lib/analytics";

function formatPageType(value?: string | null) {
  if (!value) return "Not specified";
  return value;
}

function formatGoal(value?: string | null) {
  if (!value) return "Not specified";
  return value;
}

function CoreWebVitalsCard({ metrics }: { metrics: NonNullable<NonNullable<UxAuditPublic["summary"]>["performance_metrics"]> }) {
  const items = [
    { label: "Performance", value: metrics.performance_score != null ? `${metrics.performance_score}/100` : "—" },
    { label: "LCP", value: metrics.lcp_ms != null ? `${Math.round(metrics.lcp_ms)}ms` : "—" },
    { label: "CLS", value: metrics.cls != null ? metrics.cls.toFixed(3) : "—" },
    { label: "INP", value: metrics.inp_ms != null ? `${Math.round(metrics.inp_ms)}ms` : "—" },
  ];
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <h3 className="font-semibold text-ink-900">Core Web Vitals (mobile)</h3>
      <p className="mt-1 text-xs text-ink-500">Measured via PageSpeed Insights where configured.</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-white px-3 py-2 text-center">
            <dt className="text-xs text-ink-500">{item.label}</dt>
            <dd className="font-semibold text-ink-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type AuditResultsPanelProps = {
  audit: UxAuditPublic;
  showLeadForm?: boolean;
  onLeadSubmit?: () => void;
  leadSlot?: React.ReactNode;
};

function severityBadge(severity: string) {
  const map: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-ink-100 text-ink-700 border-ink-200",
  };
  return map[severity] || map.low;
}

function confidenceBadge(confidence: string) {
  const map: Record<string, string> = {
    confirmed: "Automated observation",
    likely: "Likely issue",
    requires_expert_review: "Needs expert review",
  };
  return map[confidence] || confidence;
}

function FindingCard({ finding }: { finding: UxAuditFinding }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => {
          setOpen((v) => {
            if (!v) trackUxAuditEvent("ux_audit_finding_expanded", { severity: finding.severity });
            return !v;
          });
        }}
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${severityBadge(finding.severity)}`}>
              {severityLabel(finding.severity)}
            </span>
            <span className="rounded-full bg-ink-50 px-2 py-0.5 text-xs text-ink-600">
              {UX_AUDIT_CATEGORY_LABELS[finding.category] || finding.category}
            </span>
          </div>
          <h4 className="mt-2 font-semibold text-ink-900">{finding.title}</h4>
          <p className="mt-1 text-sm text-ink-600 line-clamp-2">{finding.explanation}</p>
        </div>
        {open ? <ChevronUp className="h-5 w-5 shrink-0 text-ink-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-ink-400" />}
      </button>
      {open ? (
        <div className="mt-4 space-y-3 border-t border-ink-100 pt-4 text-sm text-ink-700">
          {(finding.evidence_items?.length ? finding.evidence_items : [finding.evidence]).map((line, idx) => (
            <p key={idx}><span className="font-medium text-ink-900">Evidence{finding.evidence_items && finding.evidence_items.length > 1 ? ` ${idx + 1}` : ""}:</span> {line}</p>
          ))}
          <p><span className="font-medium text-ink-900">Affected:</span> {finding.affected_element}</p>
          <p><span className="font-medium text-ink-900">Recommendation:</span> {finding.recommendation}</p>
          <p><span className="font-medium text-ink-900">Expected outcome:</span> {finding.expected_ux_outcome}</p>
          <p><span className="font-medium text-ink-900">Potential business effect:</span> {finding.potential_business_effect}</p>
          <p className="text-xs text-ink-500">
            {confidenceBadge(finding.confidence)}
            {finding.measurement_source ? ` · Source: ${finding.measurement_source}` : ""}
            {finding.requires_expert_review ? " · Expert review recommended" : ""}
            {" · "}Effort: {finding.estimated_effort}
          </p>
        </div>
      ) : null}
    </article>
  );
}

export function AuditResultsPanel({ audit, leadSlot }: AuditResultsPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");

  const findings = audit.findings || [];
  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (confidenceFilter !== "all" && f.confidence !== confidenceFilter) return false;
      return true;
    });
  }, [findings, categoryFilter, severityFilter, confidenceFilter]);

  const quickWins = findings.filter(
    (f) =>
      f.estimated_effort === "low" &&
      (f.business_impact === "high" || f.business_impact === "medium") &&
      f.confidence !== "requires_expert_review",
  ).slice(0, 3);
  const topFindings = [...findings].sort((a, b) => b.priority_score - a.priority_score).slice(0, 3);
  const checkSummary = audit.check_summary;
  const coverage = audit.audit_coverage;

  if (audit.status === "failed") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h3 className="font-semibold">We could not complete this scan</h3>
            <p className="mt-2 text-sm">{audit.failure_reason || "The website could not be reached or analysed."}</p>
            <p className="mt-2 text-sm text-red-800">Try another public URL, or contact UXGuard for an expert review of protected pages.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
        <ScoreGauge score={audit.overall_score ?? 0} />
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <div>
              <p className="text-sm font-medium text-ink-500">UX score</p>
              <p className="text-xl font-semibold text-ink-900">
                {audit.overall_score != null ? `${audit.overall_score}/100` : "Incomplete"}
                {audit.score_interpretation ? (
                  <span className="ml-2 text-base font-medium text-brand-700">({audit.score_interpretation})</span>
                ) : null}
              </p>
            </div>
            {coverage != null ? (
              <div>
                <p className="text-sm font-medium text-ink-500">Audit coverage</p>
                <p className="text-xl font-semibold text-ink-900">{coverage}%</p>
              </div>
            ) : null}
          </div>
          {coverage != null ? (
            <p className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-ink-700">
              Your UX score is based on {coverage}% of the automated checks available for this website.
              {audit.score_incomplete ? " Some categories could not be fully tested — the score may be incomplete." : ""}
              {" "}Additional expert review is recommended for behavioural and business-specific findings.
            </p>
          ) : null}
          <div>
            <p className="text-sm font-medium text-ink-500">Growth opportunity</p>
            <p className="text-xl font-semibold text-ink-900">{audit.growth_opportunity || "—"}</p>
            {audit.growth_message ? <p className="mt-1 text-sm text-ink-600">{audit.growth_message}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Critical issues", value: audit.summary?.critical_issues ?? 0 },
              { label: "Opportunities", value: audit.summary?.improvement_opportunities ?? findings.length },
              { label: "Quick wins", value: audit.summary?.quick_wins ?? quickWins.length },
              { label: "Checks passed", value: checkSummary?.passed ?? "—" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-ink-100 bg-white p-3 text-center">
                <p className="text-2xl font-bold text-ink-900">{item.value}</p>
                <p className="text-xs text-ink-500">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-ink-600">
            Audited <span className="font-medium">{audit.normalized_url || audit.website_url}</span>
            {audit.completed_at ? ` · ${new Date(audit.completed_at).toLocaleDateString()}` : null}
            {audit.scan_version ? ` · Scan v${audit.scan_version}` : null}
          </p>
          <div className="grid gap-2 text-sm text-ink-600 sm:grid-cols-2">
            <p><span className="font-medium text-ink-800">Website type:</span> {formatPageType(audit.page_type)}</p>
            <p><span className="font-medium text-ink-800">Primary goal:</span> {formatGoal(audit.primary_goal)}</p>
            <p><span className="font-medium text-ink-800">Pages scanned:</span> {audit.pages_scanned?.length ?? 1}</p>
            <p>
              <span className="font-medium text-ink-800">Data sources:</span>{" "}
              {audit.capabilities?.data_sources?.join(", ") || "html"}
            </p>
          </div>
        </div>
      </div>

      {checkSummary ? (
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <h3 className="font-semibold text-ink-900">Check summary</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-7">
            {[
              ["Passed", checkSummary.passed],
              ["Warnings", checkSummary.warning],
              ["Failed", checkSummary.failed],
              ["Manual review", checkSummary.manual_review],
              ["Unavailable", checkSummary.not_tested],
              ["Not applicable", checkSummary.not_applicable],
              ["Total", checkSummary.total],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-ink-50 px-3 py-2 text-center">
                <dt className="text-xs text-ink-500">{label}</dt>
                <dd className="font-semibold text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {audit.summary?.performance_metrics ? (
        <CoreWebVitalsCard metrics={audit.summary.performance_metrics} />
      ) : audit.capabilities?.pagespeed && !audit.capabilities.pagespeed.configured ? (
        <p className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-600">
          Core Web Vitals are not configured for this environment. Add <code className="text-xs">GOOGLE_PAGESPEED_API_KEY</code> to enable mobile performance metrics.
        </p>
      ) : null}

      {audit.category_scores?.length ? (
        <div>
          <h3 className="font-display text-lg font-bold text-ink-950">Category scores</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audit.category_scores.map((row) => (
              <div key={row.category} className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-800">
                    {UX_AUDIT_CATEGORY_LABELS[row.category] || row.category}
                  </p>
                  <span className="font-display text-xl font-bold text-brand-600">
                    {row.score != null ? row.score : "—"}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100" role="presentation">
                  <div
                    className="h-full rounded-full bg-brand-500 motion-reduce:transition-none transition-all"
                    style={{ width: `${row.score ?? 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  {row.summary}
                  {row.coverage != null ? ` · Coverage ${row.coverage}%` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink-950">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Top findings
          </h3>
          <div className="mt-3 space-y-3">
            {topFindings.map((f, i) => (
              <FindingCard key={`${f.title}-${i}`} finding={f} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink-950">
            <Zap className="h-5 w-5 text-brand-600" />
            Quick wins
          </h3>
          <ul className="mt-3 space-y-2">
            {quickWins.map((f, i) => (
              <li key={`${f.title}-${i}`} className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-ink-800">
                <span className="font-medium">{f.title}</span>
                <span className="text-ink-600"> — {f.recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink-950">
            <Filter className="h-5 w-5" />
            All findings
          </h3>
          <select
            className="input-field w-auto py-1.5 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {Object.entries(UX_AUDIT_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className="input-field w-auto py-1.5 text-sm"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by severity"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="input-field w-auto py-1.5 text-sm"
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            aria-label="Filter by confidence"
          >
            <option value="all">All confidence levels</option>
            <option value="confirmed">Automated observation</option>
            <option value="likely">Likely issue</option>
            <option value="requires_expert_review">Needs expert review</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {filtered.length ? filtered.map((f, i) => <FindingCard key={`${f.title}-${i}`} finding={f} />) : (
            <p className="text-sm text-ink-500">No findings match the selected filters.</p>
          )}
        </div>
      </div>

      {audit.roadmap ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { key: "fix_now", title: "Fix now" },
            { key: "improve_next", title: "Improve next" },
            { key: "investigate_further", title: "Investigate further" },
          ].map(({ key, title }) => {
            const items = audit.roadmap?.[key as keyof typeof audit.roadmap] || [];
            return (
              <div key={key} className="rounded-xl border border-ink-100 bg-white p-4">
                <h4 className="font-semibold text-ink-900">{title}</h4>
                <ul className="mt-3 space-y-2 text-sm text-ink-700">
                  {items.length ? items.map((f, i) => (
                    <li key={i} className="border-l-2 border-brand-300 pl-3">{f.title}</li>
                  )) : <li className="text-ink-500">None flagged</li>}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      {audit.analytics_metrics && !audit.analytics_metrics.available ? (
        <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-700">
          <p className="font-medium text-ink-900">Analytics opportunities</p>
          <p className="mt-1">{audit.analytics_metrics.message}</p>
        </div>
      ) : null}

      {audit.user_research_metrics && !audit.user_research_metrics.available ? (
        <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-700">
          <p className="font-medium text-ink-900">Expert research opportunities</p>
          <p className="mt-1">{audit.user_research_metrics.message}</p>
        </div>
      ) : null}

      {audit.limitations?.length ? (
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-700">
          <p className="font-medium text-ink-900">Automated scan limitations</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {audit.limitations.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      ) : null}

      {leadSlot}
    </div>
  );
}
