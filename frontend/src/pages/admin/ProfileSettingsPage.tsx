import { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Copy, Save } from "lucide-react";
import { UrlOrUploadField } from "../../components/ui/UrlOrUploadField";
import { saveUserToRegistry } from "../../lib/platformRegistry";
import { useAuth } from "../../context/AuthContext";
import { api, resolveAssetUrl } from "../../api/client";
import type { User } from "../../types";

export function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const welcome = (location.state as { welcome?: boolean } | null)?.welcome;
  const [form, setForm] = useState<Partial<User>>({});
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        username: user.username,
        title: user.title || "",
        bio: user.bio || "",
        contact_email: user.contact_email || "",
        location: user.location || "",
        avatar_url: user.avatar_url || "",
        cv_url: user.cv_url || "",
      });
      setLinkedinUrl(user.social_links?.linkedin || "");
    }
  }, [user]);

  const portfolioUrl =
    typeof window !== "undefined" && form.username
      ? `${window.location.origin}/u/${form.username}`
      : user?.portfolio_url
        ? `${window.location.origin}${user.portfolio_url}`
        : "";

  function updateField<K extends keyof User>(key: K, value: User[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function copyPortfolioLink() {
    if (!portfolioUrl) return;
    await navigator.clipboard.writeText(portfolioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload: Partial<User> = {
        ...form,
        social_links: {
          ...(user?.social_links || {}),
          ...(linkedinUrl.trim() ? { linkedin: linkedinUrl.trim() } : {}),
        },
      };
      await api.updateMe(payload);
      await refreshUser();
      if (user) {
        saveUserToRegistry({
          ...user,
          ...payload,
          username: form.username || user.username,
        });
      }
      setMessage("Profile saved.");
    } catch {
      setMessage("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <div className="card h-64 animate-pulse bg-ink-100" />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-950">Profile & Portfolio</h1>
        <p className="mt-1 text-ink-500">
          Set your public username and share your portfolio link on your CV or LinkedIn
        </p>
      </div>

      {welcome ? (
        <div className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Welcome! Your portfolio is ready — copy your link below and add your first case study from the dashboard.
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      {portfolioUrl ? (
        <div className="card mb-6 max-w-2xl p-6">
          <p className="text-sm font-semibold text-ink-700">Your portfolio link</p>
          <p className="mt-1 text-xs text-ink-500">Share this URL — like a Behance profile for your research work</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-ink-50 px-3 py-2 text-sm text-brand-700">
              {portfolioUrl}
            </code>
            <button type="button" onClick={copyPortfolioLink} className="btn-secondary shrink-0 py-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="card max-w-2xl p-6">
        <div className="space-y-4">
          <div>
            <label className="label-field">Username</label>
            <div className="flex items-center gap-0">
              <span className="rounded-l-lg border border-r-0 border-ink-200 bg-ink-50 px-3 py-2.5 text-sm text-ink-500">
                /u/
              </span>
              <input
                className="input-field rounded-l-none"
                value={form.username || ""}
                onChange={(e) => updateField("username", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-name"
                required
              />
            </div>
            <p className="mt-1 text-xs text-ink-400">Lowercase letters, numbers, and hyphens only</p>
          </div>
          <div>
            <label className="label-field">Display Name</label>
            <input
              className="input-field"
              value={form.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>
          <UrlOrUploadField
            label="Profile Photo"
            value={form.avatar_url || ""}
            onChange={(url) => updateField("avatar_url", url)}
            accept="image/*"
            helpText="Paste a URL or upload a photo from your device"
          />
          {form.avatar_url ? (
            <div className="flex items-center gap-3 rounded-lg border border-ink-100 bg-ink-50 p-3">
              <img
                src={resolveAssetUrl(form.avatar_url)}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
              <p className="text-sm text-ink-600">Preview of your public profile photo</p>
            </div>
          ) : null}
          <div>
            <label className="label-field">Title</label>
            <input
              className="input-field"
              value={form.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Senior UX Researcher"
            />
          </div>
          <div>
            <label className="label-field">Bio</label>
            <textarea
              className="input-field min-h-[100px]"
              value={form.bio || ""}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Short intro for your portfolio page"
            />
          </div>
          <div>
            <label className="label-field">Location</label>
            <input
              className="input-field"
              value={form.location || ""}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="City, Country"
            />
          </div>
          <div>
            <label className="label-field">Contact Email (public)</label>
            <input
              type="email"
              className="input-field"
              value={form.contact_email || ""}
              onChange={(e) => updateField("contact_email", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">LinkedIn URL</label>
            <input
              type="url"
              className="input-field"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/your-profile"
            />
          </div>
          <UrlOrUploadField
            label="CV / Resume"
            value={form.cv_url || ""}
            onChange={(url) => updateField("cv_url", url)}
            accept="image/*,.pdf,.doc,.docx"
            showPreview={false}
            helpText="Paste a link or upload PDF/Word from your device"
          />
        </div>

        <button type="submit" className="btn-primary mt-6" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
