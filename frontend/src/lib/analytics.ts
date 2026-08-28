/**
 * Lightweight product analytics hooks.
 * Avoid PII / payment secrets. Wire to a real provider later if needed.
 */

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function trackBillingEvent(event: string, props: AnalyticsProps = {}) {
  try {
    if (typeof window === "undefined") return;
    const payload = { event, ...props, ts: Date.now() };
    window.dispatchEvent(new CustomEvent("uxguard:analytics", { detail: payload }));
    if (import.meta.env.DEV) {
      console.debug("[analytics]", payload);
    }
  } catch {
    // never break UX for analytics
  }
}

/** UX audit funnel events — no PII or URL content in props. */
export function trackUxAuditEvent(
  event:
    | "ux_audit_page_view"
    | "ux_audit_started"
    | "ux_audit_url_submitted"
    | "ux_audit_scan_completed"
    | "ux_audit_scan_failed"
    | "ux_audit_results_viewed"
    | "ux_audit_finding_expanded"
    | "ux_audit_report_requested"
    | "ux_audit_consultation_clicked"
    | "ux_audit_lead_submitted",
  props: AnalyticsProps = {},
) {
  trackBillingEvent(event, props);
}
