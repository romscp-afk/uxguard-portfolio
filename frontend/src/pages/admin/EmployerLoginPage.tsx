import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../context/AuthContext";

export function EmployerLoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await login(email, password, "employer");
      navigate("/admin/employer", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="mark" theme="dark" className="h-10 w-auto max-w-[240px]" />
          <h1 className="mt-6 font-display text-2xl font-bold text-white">Employer sign in</h1>
          <p className="mt-2 text-sm text-ink-400">Hire with UXGuard — company jobs and applicants</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {user && user.active_workspace !== "employer" ? (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You are signed in as a candidate. Use an employer account here to open the hiring
              portal.
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mb-4">
            <label htmlFor="employer-email" className="label-field">
              Work email
            </label>
            <input
              id="employer-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
              required
            />
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="employer-password" className="label-field">
                Password
              </label>
              <Link
                to="/admin/forgot-password"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="employer-password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in as employer"}
          </button>

          <p className="mt-6 text-center text-sm text-ink-500">
            Need an employer account?{" "}
            <Link
              to="/admin/employer/register"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Register your company
            </Link>
          </p>
          <p className="mt-3 text-center text-sm text-ink-500">
            Looking for work?{" "}
            <Link to="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Candidate sign in
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link to="/" className="text-brand-400 hover:text-brand-300">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
