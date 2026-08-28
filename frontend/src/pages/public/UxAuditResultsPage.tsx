import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { PublicFooter, PublicHeader } from "../../components/layout/PublicLayout";
import { DocumentMeta } from "../../components/seo/DocumentMeta";
import { AuditLeadForm } from "../../components/ux-audit/AuditLeadForm";
import { AuditResultsPanel } from "../../components/ux-audit/AuditResultsPanel";
import { trackUxAuditEvent } from "../../lib/analytics";
import type { UxAuditPublic } from "../../types/ux-audit";

export function UxAuditResultsPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const [audit, setAudit] = useState<UxAuditPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auditId) {
      setError("Invalid audit link.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await api.getUxAudit(auditId);
        if (!cancelled) {
          setAudit(result.audit);
          trackUxAuditEvent("ux_audit_results_viewed", { status: result.audit.status });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load audit results.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auditId]);

  const title = audit?.overall_score
    ? `UX Audit Results: ${audit.overall_score}/100 | UXGuard`
    : "UX Audit Results | UXGuard";

  const canonical =
    typeof window !== "undefined" && auditId
      ? `${window.location.origin}/ux-audit/results/${auditId}`
      : undefined;

  return (
    <div className="min-h-screen surface-page">
      <DocumentMeta
        title={title}
        description="Your UXGuard website audit results with category scores, prioritised findings, and recommended improvements."
        url={canonical}
      />
      <PublicHeader />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <p className="text-sm text-ink-500">
          <Link to="/ux-audit" className="text-brand-600 hover:underline">Free UX Audit</Link>
          {" / "}Results
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold text-ink-950">Your UX audit results</h1>

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-2 text-ink-600" role="status">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading results…
          </div>
        ) : null}

        {error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800" role="alert">
            {error}
          </div>
        ) : null}

        {audit ? (
          <div className="mt-8 space-y-8">
            <AuditResultsPanel
              audit={audit}
              leadSlot={
                <AuditLeadForm accessToken={audit.access_token} hasLead={audit.has_lead} />
              }
            />
          </div>
        ) : null}
      </main>

      <PublicFooter />
    </div>
  );
}
