import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../context/AuthContext";

export function AdminLoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/admin";

  const [email, setEmail] = useState("demo@uxguard.io");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
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
          <p className="mt-4 text-sm text-ink-400">Portfolio management for UX researchers</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mb-4">
            <label htmlFor="email" className="label-field">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="label-field">
                Password
              </label>
              <Link
                to="/admin/reset-password"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to CMS"}
          </button>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don&apos;t have an account?{" "}
            <Link to="/admin/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Create your portfolio
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-ink-400">
            Demo: demo@uxguard.io / demo1234
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link to="/" className="text-brand-400 hover:text-brand-300">
            ← Back to portfolio
          </Link>
        </p>
      </div>
    </div>
  );
}
