import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, Clock, Plus, Search, XCircle } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../lib/roles";

type EmployerRow = {
  id: number;
  display_name: string;
  legal_name: string;
  verification_status: string;
  industry?: string;
  website?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
  job_count?: number;
  member_count?: number;
  owner?: { id: number; name: string; email: string; username?: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  verified: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
  suspended: "bg-stone-100 text-stone-700 border-stone-300",
};

export function AdminEmployersPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<EmployerRow[]>([]);
  const [pendingAccounts, setPendingAccounts] = useState<
    Array<{ id: number; name: string; email: string; created_at?: string; title?: string }>
  >([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api.adminListEmployers(
        filter === "all" || filter === "awaiting_profile" ? undefined : filter,
      );
      setCompanies(data.companies || []);
      setPendingAccounts(data.pending_accounts || []);
      setCounts(data.counts || {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load employers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin(user)) return;
    void load();
  }, [user, filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      [c.display_name, c.legal_name, c.industry, c.contact_email, c.owner?.name, c.owner?.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [companies, query]);

  if (!isAdmin(user)) {
    return <p className="text-sm text-red-700">Admin access required.</p>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Super admin
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink">Employers</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Review employer registrations and approve companies before they can publish jobs.
          </p>
        </div>
        <Link
          to="/admin/users/new"
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm text-white"
        >
          <Plus className="h-4 w-4" />
          Create account
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["all", "All", counts.all],
          ["pending", "Pending", counts.pending],
          ["verified", "Verified", counts.verified],
          ["rejected", "Rejected", counts.rejected],
          ["awaiting_profile", "No company yet", counts.awaiting_profile],
        ].map(([id, label, value]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(String(id))}
            className={`rounded-lg border px-4 py-3 text-left ${
              filter === id ? "border-ink bg-ink text-white" : "border-stone-200 bg-white"
            }`}
          >
            <p className={`text-xs uppercase tracking-wide ${filter === id ? "text-white/70" : "text-stone-500"}`}>
              {label}
            </p>
            <p className="mt-1 font-display text-2xl">{value ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-stone-400" />
        <input
          className="w-full border-0 bg-transparent text-sm outline-none"
          placeholder="Search companies or owners…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {pendingAccounts.length > 0 && (filter === "all" || filter === "awaiting_profile") && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-950">
            Employer accounts awaiting company profile ({pendingAccounts.length})
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {pendingAccounts.map((a) => (
              <li key={a.id}>
                {a.name} · {a.email}
                {a.title ? ` · ${a.title}` : ""} — registered, no company submitted yet
              </li>
            ))}
          </ul>
        </div>
      )}

      {filter === "awaiting_profile" ? null : loading ? (
        <p className="text-sm text-stone-500">Loading employers…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 px-6 py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-stone-400" />
          <p className="mt-4 font-medium">No employers found</p>
        </div>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-lg border border-stone-200 bg-white">
          {filtered.map((company) => (
            <li key={company.id}>
              <Link
                to={`/admin/employers/${company.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-stone-50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{company.display_name}</p>
                  <p className="text-sm text-stone-600">
                    {company.owner?.name || "Unknown owner"} · {company.owner?.email}
                    {company.industry ? ` · ${company.industry}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {company.job_count ?? 0} jobs · {company.member_count ?? 0} members ·{" "}
                    {company.created_at?.slice(0, 10)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                    STATUS_STYLES[company.verification_status] || STATUS_STYLES.pending
                  }`}
                >
                  {company.verification_status === "verified" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : company.verification_status === "rejected" ? (
                    <XCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  {company.verification_status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
