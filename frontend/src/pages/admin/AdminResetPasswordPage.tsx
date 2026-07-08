import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../context/AuthContext";

export function AdminResetPasswordPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenState, setTokenState] = useState<"loading" | "valid" | "invalid">(
    token ? "loading" : "invalid",
  );

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Request a new one from the login page.");
      setTokenState("invalid");
      return;
    }

    api
      .verifyResetToken(token)
      .then((result) => {
        if (result.valid && result.email) {
          setEmail(result.email);
          setTokenState("valid");
          setError("");
        } else {
          setTokenState("invalid");
          setError(result.detail || "This reset link is invalid or has expired.");
        }
      })
      .catch((err) => {
        setTokenState("invalid");
        setError(err instanceof ApiError ? err.message : "This reset link is invalid or has expired.");
      });
  }, [token]);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (tokenState !== "valid" || !token) {
      setError("Invalid reset link.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.resetPassword(token, newPassword);
      setSuccess(result.message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  if (tokenState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
        <div className="card w-full max-w-md p-8 text-center text-sm text-ink-500">Verifying reset link...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="mark" theme="dark" className="h-10 w-auto max-w-[240px]" />
          <p className="mt-4 text-sm text-ink-400">Choose a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              {tokenState === "invalid" ? (
                <p className="mt-2">
                  <Link to="/admin/forgot-password" className="font-semibold underline">
                    Request a new reset link
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}
          {success ? (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}{" "}
              <Link to="/admin/login" className="font-semibold text-emerald-900 underline">
                Sign in
              </Link>
            </div>
          ) : null}

          {tokenState === "valid" && email && !success ? (
            <div className="mb-4 rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
              Resetting password for <strong>{email}</strong>
            </div>
          ) : null}

          {tokenState === "valid" && !success ? (
            <>
              <div className="mb-4">
                <label htmlFor="new-password" className="label-field">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="confirm-password" className="label-field">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
              </button>
            </>
          ) : null}

          <p className="mt-6 text-center text-sm text-ink-500">
            <Link to="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
