import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Copy, ExternalLink, Save, Sparkles } from "lucide-react";
import { UrlOrUploadField } from "../../components/ui/UrlOrUploadField";
import { ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { saveUserToRegistry } from "../../lib/platformRegistry";
import { useAssistant, useAssistantDraft, useAssistantPage } from "../../context/AssistantContext";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError, resolveAssetUrl, toStoredAssetUrl } from "../../api/client";
import { canEditPlatform } from "../../lib/roles";
import type { User } from "../../types";

export function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const welcome = (location.state as { welcome?: boolean } | null)?.welcome;
  const [form, setForm] = useState<Partial<User>>({});
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
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
        cover_image_url: user.cover_image_url || "",
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

  async function persistMediaField(
    field: "avatar_url" | "cover_image_url" | "cv_url",
    url: string,
  ) {
    if (!canEditPlatform(user)) return;
    const stored = toStoredAssetUrl(url) || url.trim();
    if (!stored) return;

    updateField(field, stored);
    try {
      const saved = await api.updateMe({ [field]: stored });
      await refreshUser();
      setForm((prev) => ({
        ...prev,
        avatar_url: saved.avatar_url || "",
        cover_image_url: saved.cover_image_url || "",
        cv_url: saved.cv_url || "",
      }));
      setMessageType("success");
      setMessage(
        field === "cv_url"
          ? "CV saved to your profile."
          : field === "avatar_url"
            ? "Profile photo saved."
            : "Cover photo saved.",
      );
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof ApiError ? err.message : "Upload saved locally but profile update failed.");
    }
  }

  async function copyPortfolioLink() {
    if (!portfolioUrl) return;
    await navigator.clipboard.writeText(portfolioUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEditPlatform(user)) {
      setMessageType("error");
      setMessage("Your account is read-only. Register as Professional to edit your profile.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload: Partial<User> = {
        name: form.name?.trim() || "",
        username: form.username?.trim() || "",
        title: form.title?.trim() || "",
        bio: form.bio?.trim() || "",
        contact_email: form.contact_email?.trim() || "",
        location: form.location?.trim() || "",
        avatar_url: toStoredAssetUrl(form.avatar_url) || "",
        cover_image_url: toStoredAssetUrl(form.cover_image_url) || "",
        cv_url: toStoredAssetUrl(form.cv_url) || form.cv_url?.trim() || "",
        social_links: {
          ...(linkedinUrl.trim() ? { linkedin: linkedinUrl.trim() } : {}),
        },
      };

      const saved = await api.updateMe(payload);
      await refreshUser();
      saveUserToRegistry({
        ...saved,
        username: saved.username,
        social_links: saved.social_links || {},
      });
      setForm({
        name: saved.name,
        username: saved.username,
        title: saved.title || "",
        bio: saved.bio || "",
        contact_email: saved.contact_email || "",
        location: saved.location || "",
        avatar_url: saved.avatar_url || "",
        cover_image_url: saved.cover_image_url || "",
        cv_url: saved.cv_url || "",
      });
      setLinkedinUrl(saved.social_links?.linkedin || "");
      setMessageType("success");
      setMessage("Profile saved. Open your public profile to confirm the updates.");
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof ApiError ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const { setOpen: openAssistant } = useAssistant();
  const canEdit = canEditPlatform(user);

  const applyAssistantUpdates = useCallback(
    (updates: Record<string, unknown>) => {
      if (typeof updates.name === "string") updateField("name", updates.name);
      if (typeof updates.title === "string") updateField("title", updates.title);
      if (typeof updates.bio === "string") updateField("bio", updates.bio);
      if (typeof updates.location === "string") updateField("location", updates.location);
      setMessageType("success");
      setMessage("AI suggestions applied to your profile. Review and save when ready.");
    },
    [],
  );

  useAssistantPage({
    type: "profile",
    pageLabel: form.name || user?.name || "Profile",
    onApply: canEdit ? applyAssistantUpdates : undefined,
  });

  const assistantDraft = useMemo(
    () => ({
      name: form.name,
      title: form.title,
      bio: form.bio,
      location: form.location,
    }),
    [form.name, form.title, form.bio, form.location],
  );

  useAssistantDraft(assistantDraft);

  if (!user) {
    return <div className="card h-64 animate-pulse bg-ink-100" />;
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Profile & Portfolio</h1>
          <p className="mt-1 text-ink-500">
            Set your public username and share your portfolio link on your CV or LinkedIn
          </p>
        </div>
        {portfolioUrl ? (
          <a
            href={portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <ExternalLink className="h-4 w-4" />
            View public profile
          </a>
        ) : null}
        {canEdit ? (
          <button type="button" onClick={() => openAssistant(true)} className="btn-secondary">
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </button>
        ) : null}
      </div>

      {welcome ? (
        <div className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Welcome! Your portfolio is ready — copy your link below and add your first case study from the dashboard.
        </div>
      ) : null}

      {message ? (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            messageType === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      {portfolioUrl ? (
        <div className="card mb-6 max-w-2xl p-6">
          <p className="text-sm font-semibold text-ink-700">Your portfolio link</p>
          <p className="mt-1 text-xs text-ink-500">
            Share this URL to showcase your professional identity and impact
          </p>
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
                disabled={!canEditPlatform(user)}
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
              disabled={!canEditPlatform(user)}
            />
          </div>

          <UrlOrUploadField
            label="Cover photo"
            value={form.cover_image_url || ""}
            onChange={(url) => updateField("cover_image_url", url)}
            onCommit={(url) => void persistMediaField("cover_image_url", url)}
            accept="image/*"
            variant="cover"
            uploadPurpose="cover"
            helpText="Wide banner image for the top of your public profile (recommended 1600×600). Saved as soon as you upload."
          />
          {form.cover_image_url ? (
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
              <img
                src={resolveAssetUrl(form.cover_image_url)}
                alt=""
                className="aspect-[16/6] w-full object-cover"
              />
            </div>
          ) : null}

          <UrlOrUploadField
            label="Profile Photo"
            value={form.avatar_url || ""}
            onChange={(url) => updateField("avatar_url", url)}
            onCommit={(url) => void persistMediaField("avatar_url", url)}
            accept="image/*"
            showPreview={false}
            uploadPurpose="avatar"
            helpText="Square photos work best. Saved as soon as you upload."
          />
          {form.avatar_url ? (
            <div className="flex items-center gap-4 rounded-lg border border-ink-100 bg-ink-50 p-4">
              <div className="h-24 w-24 overflow-hidden rounded-2xl bg-white ring-2 ring-brand-100">
                <img
                  src={resolveAssetUrl(form.avatar_url)}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-800">Profile photo preview</p>
                <p className="mt-1 break-all text-xs text-ink-400">{form.avatar_url}</p>
              </div>
            </div>
          ) : null}

          <div>
            <label className="label-field">Title</label>
            <input
              className="input-field"
              value={form.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Senior UX Researcher"
              disabled={!canEditPlatform(user)}
            />
          </div>
          <div>
            <label className="label-field">Bio</label>
            <textarea
              className="input-field min-h-[100px]"
              value={form.bio || ""}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Short intro for your portfolio page"
              disabled={!canEditPlatform(user)}
            />
          </div>
          <div>
            <label className="label-field">Location</label>
            <input
              className="input-field"
              value={form.location || ""}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="City, Country"
              disabled={!canEditPlatform(user)}
            />
          </div>
          <div>
            <label className="label-field">Contact Email (public)</label>
            <input
              type="email"
              className="input-field"
              value={form.contact_email || ""}
              onChange={(e) => updateField("contact_email", e.target.value)}
              disabled={!canEditPlatform(user)}
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
              disabled={!canEditPlatform(user)}
            />
          </div>
          <UrlOrUploadField
            label="CV / Resume"
            value={form.cv_url || ""}
            onChange={(url) => updateField("cv_url", url)}
            onCommit={(url) => void persistMediaField("cv_url", url)}
            accept="image/*,.pdf,.doc,.docx"
            showPreview={false}
            uploadPurpose="cv"
            helpText="Upload a PDF/Word file or paste a link — saved to your public profile as soon as you upload."
          />
          {form.cv_url ? (
            <a
              href={resolveAssetUrl(form.cv_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-500"
            >
              <ExternalLink className="h-4 w-4" />
              View CV in new tab
            </a>
          ) : null}
        </div>

        <button type="submit" className="btn-primary mt-6" disabled={saving || !canEditPlatform(user)}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
