import { type FormEvent, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { trackUxAuditEvent } from "../../lib/analytics";
import type { UxAuditLeadPayload } from "../../types/ux-audit";

type AuditLeadFormProps = {
  accessToken: string;
  defaultCompany?: string;
  hasLead?: boolean;
};

export function AuditLeadForm({ accessToken, defaultCompany = "", hasLead }: AuditLeadFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(defaultCompany);
  const [jobRole, setJobRole] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceConsent, setServiceConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [requestType, setRequestType] = useState<"report" | "consultation">("report");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(e: FormEvent, type: "report" | "consultation") {
    e.preventDefault();
    if (submitting) return;
    setRequestType(type);
    setSubmitting(true);
    setError("");

    const payload: UxAuditLeadPayload = {
      full_name: fullName,
      business_email: email,
      company_name: company,
      job_role: jobRole || undefined,
      phone: phone || undefined,
      service_consent: serviceConsent,
      marketing_consent: marketingConsent,
      request_type: type,
      uxg_hp: honeypot,
    };

    try {
      await api.submitUxAuditLead(accessToken, payload);
      setSuccess(true);
      trackUxAuditEvent("ux_audit_lead_submitted", { request_type: type });
      if (type === "consultation") {
        trackUxAuditEvent("ux_audit_consultation_clicked");
      } else {
        trackUxAuditEvent("ux_audit_report_requested");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (hasLead || success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h3 className="font-semibold">Request received</h3>
            <p className="mt-1 text-sm">
              Thank you. The UXGuard team will follow up about your {requestType === "consultation" ? "consultation" : "full report"}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm" onSubmit={(e) => submit(e, "report")}>
      <h3 className="font-display text-xl font-bold text-ink-950">Get your full report or expert review</h3>
      <p className="mt-2 text-sm text-ink-600">
        Optional — your results above are already available. Share contact details if you would like the full report emailed or a human review.
      </p>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-name" className="label-field">Full name</label>
          <input id="lead-name" className="input-field" required value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={submitting} />
        </div>
        <div>
          <label htmlFor="lead-email" className="label-field">Business email</label>
          <input id="lead-email" type="email" className="input-field" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
        </div>
        <div>
          <label htmlFor="lead-company" className="label-field">Company name</label>
          <input id="lead-company" className="input-field" required value={company} onChange={(e) => setCompany(e.target.value)} disabled={submitting} />
        </div>
        <div>
          <label htmlFor="lead-role" className="label-field">Job role <span className="text-ink-400">(optional)</span></label>
          <input id="lead-role" className="input-field" value={jobRole} onChange={(e) => setJobRole(e.target.value)} disabled={submitting} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="lead-phone" className="label-field">Phone <span className="text-ink-400">(optional)</span></label>
          <input id="lead-phone" type="tel" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} />
        </div>
      </div>

      <div className="sr-only" aria-hidden>
        <label htmlFor="lead-hp">Leave blank</label>
        <input id="lead-hp" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input type="checkbox" required checked={serviceConsent} onChange={(e) => setServiceConsent(e.target.checked)} disabled={submitting} className="mt-1" />
          <span>I consent to UXGuard processing my details to provide the requested audit report or consultation.</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink-600">
          <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} disabled={submitting} className="mt-1" />
          <span>I would like to receive occasional UX and product insights from UXGuard (optional).</span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={submitting || !serviceConsent}>
          {submitting && requestType === "report" ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
          Send My Full Report
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={submitting || !serviceConsent}
          onClick={(e) => submit(e as unknown as FormEvent, "consultation")}
        >
          {submitting && requestType === "consultation" ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
          Review My Results With UXGuard
        </button>
      </div>
    </form>
  );
}
