import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../context/AuthContext";

export function AdminForgotPasswordPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="mark" theme="dark" className="h-10 w-auto max-w-[240px]" />
          <p className="mt-4 text-sm text-ink-400">We&apos;ll email you a secure reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          {success ? (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
          ) : null}

          <div className="mb-6">
            <label htmlFor="email" className="label-field">
              Account email
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <p className="mt-2 text-xs text-ink-400">
              Enter the email you used to register. A reset link will be sent if the account exists.
            </p>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading || Boolean(success)}>
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <p className="mt-6 text-center text-sm text-ink-500">
            Remember your password?{" "}
            <Link to="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Back to sign in
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
