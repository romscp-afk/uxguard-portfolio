import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../context/AuthContext";

export function EmployerRegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyHint, setCompanyHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.active_workspace === "employer" && user?.workspaces?.employer) {
    return <Navigate to="/admin/employer" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        title: companyHint.trim() || "Hiring manager",
        role: "professional",
        account_type: "employer",
        onboarding_intent: "build_portfolio",
      });
      navigate("/admin/employer", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="mark" theme="dark" className="h-10 w-auto max-w-[240px]" />
          <h1 className="mt-6 font-display text-2xl font-bold text-white">Create employer account</h1>
          <p className="mt-2 text-sm text-ink-400">
            Separate from candidate profiles — for hiring teams only
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mb-4">
            <label htmlFor="er-name" className="label-field">
              Your name
            </label>
            <input
              id="er-name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="er-email" className="label-field">
              Work email
            </label>
            <input
              id="er-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="er-company" className="label-field">
              Company (optional)
            </label>
            <input
              id="er-company"
              className="input-field"
              value={companyHint}
              onChange={(e) => setCompanyHint(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="mb-6">
            <label htmlFor="er-password" className="label-field">
              Password
            </label>
            <input
              id="er-password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating..." : "Create employer account"}
          </button>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an employer account?{" "}
            <Link
              to="/admin/employer/login"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Sign in
            </Link>
          </p>
          <p className="mt-3 text-center text-sm text-ink-500">
            Want a candidate profile instead?{" "}
            <Link to="/admin/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Candidate registration
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
