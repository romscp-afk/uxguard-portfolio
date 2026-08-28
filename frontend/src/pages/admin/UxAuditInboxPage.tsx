import { useEffect, useState } from "react";
import { ClipboardList, Loader2, RefreshCw, Search } from "lucide-react";
import { api, ApiError } from "../../api/client";
import type { UxAuditAdminRow } from "../../types/ux-audit";

const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent", "won", "closed"];

export function UxAuditInboxPage() {
  const [audits, setAudits] = useState<UxAuditAdminRow[]>([]);
  const [selected, setSelected] = useState<UxAuditAdminRow | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");

  async function load(q = query) {
    setLoading(true);
    setError("");
    try {
      const result = await api.getUxAuditRequests({ q: q.trim() || undefined });
      setAudits(result.audits || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load audits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openAudit(row: UxAuditAdminRow) {
    setSelected(row);
    setNotes(row.internal_notes || "");
    try {
      const detail = await api.getUxAuditRequest(row.id);
      setSelected(detail.audit);
      setNotes(detail.audit.internal_notes || "");
    } catch {
      // keep list row
    }
  }

  async function rerunSelected() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.rerunUxAuditRequest(selected.id);
      setSelected(result.audit);
      setAudits((prev) => prev.map((a) => (a.id === result.audit.id ? { ...a, ...result.audit } : a)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not re-run audit.");
    } finally {
      setBusy(false);
    }
  }

  async function saveStatus(lead_status: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.updateUxAuditRequest(selected.id, { lead_status, internal_notes: notes });
      setSelected(updated.audit);
      setAudits((prev) => prev.map((a) => (a.id === updated.audit.id ? { ...a, ...updated.audit } : a)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const rows = audits.map((a) => [
      a.id,
      a.website_url,
      a.company_name || "",
      a.status,
      a.overall_score ?? "",
      a.lead_status || "",
      a.lead?.business_email || "",
      a.submitted_at,
    ]);
    const csv = ["id,url,company,status,score,lead_status,email,submitted_at", ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ux-audits.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">UX Audit Inbox</h1>
          <p className="text-sm text-ink-500">Review submissions, leads, and audit outcomes.</p>
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input-field pl-9"
            placeholder="Search URL, company, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-ink-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : (
            <ul className="divide-y divide-ink-100 max-h-[32rem] overflow-y-auto">
              {audits.length ? audits.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink-50 ${selected?.id === a.id ? "bg-brand-50" : ""}`}
                    onClick={() => void openAudit(a)}
                  >
                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">{a.normalized_url || a.website_url}</p>
                      <p className="text-xs text-ink-500">
                        {a.status} · Score {a.overall_score ?? "—"} · {new Date(a.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                </li>
              )) : (
                <li className="p-8 text-center text-sm text-ink-500">No audits yet.</li>
              )}
            </ul>
          )}
        </div>

        <div className="card p-6">
          {selected ? (
            <div className="space-y-4">
              <h2 className="font-semibold text-ink-900">{selected.normalized_url || selected.website_url}</h2>
              <dl className="grid gap-2 text-sm">
                <div><dt className="text-ink-500">Status</dt><dd>{selected.status}</dd></div>
                <div><dt className="text-ink-500">Score</dt><dd>{selected.overall_score ?? "—"} / 100</dd></div>
                <div><dt className="text-ink-500">Growth opportunity</dt><dd>{selected.growth_opportunity || "—"}</dd></div>
                {selected.failure_reason ? (
                  <div><dt className="text-ink-500">Failure</dt><dd className="text-red-700">{selected.failure_reason}</dd></div>
                ) : null}
                {selected.lead ? (
                  <>
                    <div><dt className="text-ink-500">Lead</dt><dd>{selected.lead.full_name} · {selected.lead.business_email}</dd></div>
                    <div><dt className="text-ink-500">Company</dt><dd>{selected.lead.company_name}</dd></div>
                  </>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={busy}
                  onClick={() => void rerunSelected()}
                >
                  <RefreshCw className={`mr-2 inline h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                  Re-run audit
                </button>
              </div>
              <div>
                <label htmlFor="lead-status" className="label-field">Lead status</label>
                <select
                  id="lead-status"
                  className="input-field"
                  value={selected.lead_status || "new"}
                  disabled={busy}
                  onChange={(e) => void saveStatus(e.target.value)}
                >
                  {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="notes" className="label-field">Internal notes</label>
                <textarea
                  id="notes"
                  className="input-field min-h-[100px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={busy}
                />
                <button type="button" className="btn-secondary mt-2 text-sm" disabled={busy} onClick={() => void saveStatus(selected.lead_status || "new")}>
                  Save notes
                </button>
              </div>
              <a
                href={`/ux-audit/results/${selected.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 hover:underline"
              >
                View public results
              </a>
            </div>
          ) : (
            <p className="text-sm text-ink-500">Select an audit to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
