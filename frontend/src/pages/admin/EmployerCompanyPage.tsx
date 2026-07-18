import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type { Company, CompanyMember } from "../../types";

export function EmployerCompanyPage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getCompany(Number(companyId))
      .then((data) => setCompany(data.company))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load company."));
  }, [companyId]);

  async function save() {
    if (!company) return;
    setSaving(true);
    try {
      const data = await api.updateCompany(company.id, company);
      setCompany(data.company);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!company) {
    return error ? <p className="text-sm text-red-600">{error}</p> : (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/admin/employer" className="inline-flex items-center gap-2 text-sm text-ink-600">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <h1 className="font-display text-3xl font-bold text-ink-950">Company profile</h1>
      <p className="text-sm text-ink-500">
        Verification status: <span className="capitalize">{company.verification_status}</span> (admin-controlled)
      </p>
      <ReadOnlyNotice />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <EditGuard>
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          {(["display_name", "legal_name", "industry", "website", "headquarters", "contact_email"] as const).map(
            (key) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block font-medium capitalize text-ink-800">{key.replace(/_/g, " ")}</span>
                <input
                  className="input-field"
                  value={String(company[key] || "")}
                  onChange={(e) => setCompany({ ...company, [key]: e.target.value })}
                />
              </label>
            ),
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Description</span>
            <textarea
              className="input-field min-h-[100px]"
              value={company.description || ""}
              onChange={(e) => setCompany({ ...company, description: e.target.value })}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <Link to={`/admin/employer/company/${company.id}/team`} className="btn-secondary">
              Manage team
            </Link>
          </div>
        </div>
      </EditGuard>
    </div>
  );
}

export function EmployerTeamPage() {
  const { companyId } = useParams();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("recruiter");
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await api.listCompanyMembers(Number(companyId));
    setMembers(data.members || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof ApiError ? err.message : "Could not load team."));
  }, [companyId]);

  async function invite() {
    try {
      const result = await api.inviteCompanyMember(Number(companyId), { email, role });
      setInviteToken(result.invite_token);
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invite failed.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to={`/admin/employer/company/${companyId}`} className="inline-flex items-center gap-2 text-sm text-ink-600">
        <ArrowLeft className="h-4 w-4" /> Company
      </Link>
      <h1 className="font-display text-3xl font-bold text-ink-950">Team</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <EditGuard>
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Invite member</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input className="input-field flex-1" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className="input-field max-w-[10rem]" value={role} onChange={(e) => setRole(e.target.value)}>
              {["admin", "recruiter", "hiring_manager", "reviewer"].map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
              ))}
            </select>
            <button type="button" className="btn-primary" onClick={() => void invite()}>Invite</button>
          </div>
          {inviteToken ? (
            <p className="mt-2 break-all text-xs text-ink-500">Invite token (share securely): {inviteToken}</p>
          ) : null}
        </div>
      </EditGuard>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="rounded-lg border border-ink-200 bg-white px-4 py-3 text-sm">
            <span className="font-medium">{m.email}</span>
            <span className="ml-2 capitalize text-ink-500">{m.role.replace(/_/g, " ")} · {m.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
