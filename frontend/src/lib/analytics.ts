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
