import { FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../context/AuthContext";
import { INTENT_OPTIONS, ROLE_OPTIONS, type OnboardingIntent } from "../../lib/roles";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminRegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [onboardingIntent, setOnboardingIntent] = useState<OnboardingIntent>("build_portfolio");
  const [accountRole, setAccountRole] = useState<"professional" | "viewer">("professional");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const previewUsername = useMemo(() => {
    if (username.trim()) return slugify(username);
    if (name.trim()) return slugify(name) || "your-name";
    return "your-name";
  }, [username, name]);

  const portfolioPreview =
    typeof window !== "undefined"
      ? `${window.location.origin}/u/${previewUsername}`
      : `/u/${previewUsername}`;

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const created = await register({
        name,
        email,
        password,
        username: username.trim() || undefined,
        title: title.trim() || undefined,
        onboarding_intent: onboardingIntent,
        role: accountRole,
      });
      navigate("/admin", {
        replace: true,
        state: { welcome: true, portfolioUrl: created.portfolio_url },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo variant="mark" theme="dark" className="h-10 w-auto max-w-[240px]" />
          <h1 className="mt-6 font-display text-2xl font-bold text-white">Join UXGuard Studio</h1>
          <p className="mt-2 text-sm text-ink-400">
            Step {step} of 2 — {step === 1 ? "Create your account" : "Choose how you'll use the platform"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8">
          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {step === 1 ? (
            <>
              <div className="mb-4">
                <label htmlFor="name" className="label-field">
                  Full name
                </label>
                <input
                  id="name"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="username" className="label-field">
                  Portfolio username
                </label>
                <div className="flex items-center gap-0">
                  <span className="rounded-l-lg border border-r-0 border-ink-200 bg-ink-50 px-3 py-2.5 text-sm text-ink-500">
                    /u/
                  </span>
                  <input
                    id="username"
                    className="input-field rounded-l-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder={slugify(name) || "alex-rivera"}
                  />
                </div>
                <p className="mt-1.5 truncate text-xs text-ink-400">Your link: {portfolioPreview}</p>
              </div>

              <div className="mb-4">
                <label htmlFor="title" className="label-field">
                  Title <span className="font-normal text-ink-400">(optional)</span>
                </label>
                <input
                  id="title"
                  className="input-field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Senior UX Researcher"
                />
              </div>

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
                <label htmlFor="password" className="label-field">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-ink-400">At least 8 characters</p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <p className="label-field">What&apos;s your primary goal?</p>
                <div className="space-y-3">
                  {INTENT_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                        onboardingIntent === option.id
                          ? "border-brand-400 bg-brand-50"
                          : "border-ink-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="intent"
                        checked={onboardingIntent === option.id}
                        onChange={() => setOnboardingIntent(option.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-medium text-ink-900">{option.title}</span>
                        <span className="block text-sm text-ink-500">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="label-field">Account type</p>
                <div className="space-y-3">
                  {ROLE_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                        accountRole === option.id
                          ? "border-brand-400 bg-brand-50"
                          : "border-ink-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        checked={accountRole === option.id}
                        onChange={() => setAccountRole(option.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-medium text-ink-900">{option.title}</span>
                        <span className="block text-sm text-ink-500">{option.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3">
            {step === 2 ? (
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </button>
            ) : null}
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? "Creating account..." : step === 1 ? "Continue" : "Create account"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account?{" "}
            <Link to="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
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
