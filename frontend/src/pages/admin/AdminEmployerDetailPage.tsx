import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../lib/roles";

export function AdminEmployerDetailPage() {
  const { companyId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.adminGetEmployer>> | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setError("");
    try {
      setDetail(await api.adminGetEmployer(Number(companyId)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load employer.");
    }
  }

  useEffect(() => {
    if (!isAdmin(user) || !companyId) return;
    void load();
  }, [user, companyId]);

  async function setStatus(status: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.adminVerifyEmployer(Number(companyId), { status, note });
      setMessage(`Company marked as ${status}.`);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin(user)) {
    return <p className="text-sm text-red-700">Admin access required.</p>;
  }

  if (!detail && !error) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  if (!detail) {
    return (
      <div>
        <Link to="/admin/employers" className="text-sm text-stone-500">
          ← Employers
        </Link>
        <p className="mt-4 text-red-700">{error}</p>
      </div>
    );
  }

  const { company, owner, members, jobs } = detail;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/admin/employers" className="text-sm text-stone-500 hover:text-ink">
          ← Employers
        </Link>
        <h1 className="mt-2 font-display text-3xl text-ink">{company.display_name}</h1>
        <p className="mt-1 text-sm text-stone-600">
          Status: <span className="font-medium capitalize">{company.verification_status}</span>
          {company.verified_at ? ` · verified ${company.verified_at.slice(0, 10)}` : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      )}

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Company profile</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-stone-500">Legal name</dt>
            <dd>{company.legal_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Industry</dt>
            <dd>{company.industry || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Website</dt>
            <dd>{company.website || "—"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Contact</dt>
            <dd>{company.contact_email || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-stone-500">Description</dt>
            <dd className="whitespace-pre-wrap">{company.description || "—"}</dd>
          </div>
          {company.moderation_note ? (
            <div className="sm:col-span-2">
              <dt className="text-stone-500">Moderation note</dt>
              <dd>{company.moderation_note}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Owner</h2>
        {owner ? (
          <p className="mt-2 text-sm">
            {owner.name} · {owner.email}
            <button
              type="button"
              className="ml-3 text-brand-600 hover:underline"
              onClick={() => navigate(`/admin/users/${owner.id}`)}
            >
              View user
            </button>
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone-500">Owner not found</p>
        )}
        <p className="mt-1 text-xs text-stone-500">
          {members.length} team members · {jobs.length} jobs
        </p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Verification decision</h2>
        <p className="mt-1 text-sm text-stone-600">
          Verified employers can publish jobs. Pending / rejected / suspended cannot.
        </p>
        <textarea
          className="mt-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          rows={3}
          placeholder="Optional note to the employer…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void setStatus("verified")}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm"
            onClick={() => void setStatus("pending")}
          >
            Mark pending
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
            onClick={() => void setStatus("rejected")}
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-stone-400 px-4 py-2 text-sm"
            onClick={() => void setStatus("suspended")}
          >
            Suspend
          </button>
        </div>
      </section>

      {jobs.length > 0 && (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-medium">Jobs</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {jobs.map((j) => (
              <li key={j.id} className="flex justify-between gap-2 border-b border-stone-100 py-2">
                <span>{j.title || `Job #${j.id}`}</span>
                <span className="capitalize text-stone-500">{j.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
