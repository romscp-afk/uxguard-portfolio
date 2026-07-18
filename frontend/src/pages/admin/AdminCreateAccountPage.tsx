import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../lib/roles";

export function AdminCreateAccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<"candidate" | "employer">("candidate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [autoVerify, setAutoVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    email: string;
    password: string;
    account_type: string;
    company_id?: number | null;
  } | null>(null);

  if (!isAdmin(user)) {
    return <p className="text-sm text-red-700">Admin access required.</p>;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setCreated(null);
    try {
      const result = await api.adminCreateAccount({
        account_type: accountType,
        name,
        email,
        password,
        title: title || undefined,
        company_name: accountType === "employer" ? companyName || undefined : undefined,
        legal_name: accountType === "employer" ? companyName || undefined : undefined,
        industry: accountType === "employer" ? industry || undefined : undefined,
        website: accountType === "employer" ? website || undefined : undefined,
        auto_verify: accountType === "employer" ? autoVerify : false,
      });
      setCreated({
        email,
        password,
        account_type: accountType,
        company_id: result.company_id,
      });
      if (accountType === "employer" && result.company_id) {
        // stay to show credentials, then link
      } else if (result.user?.id) {
        // optional navigate later
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/admin/users" className="text-sm text-stone-500 hover:text-ink">
        ← Users
      </Link>
      <h1 className="mt-3 font-display text-3xl text-ink">Create account</h1>
      <p className="mt-2 text-sm text-stone-600">
        Super admins can create candidate users or employer accounts. Employers still need company
        approval before publishing jobs unless you auto-verify.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex gap-2">
          {(["candidate", "employer"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={`rounded-md px-4 py-2 text-sm capitalize ${
                accountType === type ? "bg-ink text-white" : "border border-stone-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <label className="block text-sm">
          Full name
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Temporary password
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label className="block text-sm">
          Title (optional)
          <input
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        {accountType === "employer" && (
          <div className="space-y-3 rounded-md border border-stone-200 bg-stone-50 p-4">
            <label className="block text-sm">
              Company name
              <input
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Optional — creates a pending company"
              />
            </label>
            <label className="block text-sm">
              Industry
              <input
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Website
              <input
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoVerify}
                onChange={(e) => setAutoVerify(e.target.checked)}
              />
              Auto-approve company (can publish jobs immediately)
            </label>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-ink px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      {created && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-medium">Account created</p>
          <p className="mt-2">
            Email: <code>{created.email}</code>
          </p>
          <p>
            Password: <code>{created.password}</code>
          </p>
          <p className="mt-2">
            Sign-in:{" "}
            {created.account_type === "employer" ? "/admin/employer/login" : "/admin/login"}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/admin/users" className="underline">
              View users
            </Link>
            {created.company_id ? (
              <Link to={`/admin/employers/${created.company_id}`} className="underline">
                Review company
              </Link>
            ) : (
              <Link to="/admin/employers" className="underline">
                Employers
              </Link>
            )}
            <button type="button" className="underline" onClick={() => navigate("/admin/users")}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
