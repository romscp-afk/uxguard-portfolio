import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Save, Trash2 } from "lucide-react";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { isAdmin } from "../../lib/roles";
import type { AdminUserSummary } from "../../types";

export function AdminUserDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();
  const { user: actor } = useAuth();

  const [form, setForm] = useState<Partial<AdminUserSummary> & { password?: string }>({});
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (!isAdmin(actor) || !Number.isFinite(userId)) return;
    setLoading(true);
    api
      .adminGetUser(userId)
      .then((data) => {
        setForm(data);
        setLinkedinUrl(data.social_links?.linkedin || "");
      })
      .catch((err) => {
        setMessageType("error");
        setMessage(err instanceof ApiError ? err.message : "Could not load user.");
      })
      .finally(() => setLoading(false));
  }, [actor, userId]);

  if (!isAdmin(actor)) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-600">Admin access required.</p>
      </div>
    );
  }

  function updateField<K extends keyof AdminUserSummary>(key: K, value: AdminUserSummary[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(userId)) return;
    setSaving(true);
    setMessage("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        username: form.username,
        title: form.title || "",
        bio: form.bio || "",
        contact_email: form.contact_email || "",
        location: form.location || "",
        avatar_url: form.avatar_url || "",
        cover_image_url: form.cover_image_url || "",
        cv_url: form.cv_url || "",
        role: form.role,
        onboarding_intent: form.onboarding_intent,
        social_links: {
          ...(linkedinUrl.trim() ? { linkedin: linkedinUrl.trim() } : {}),
        },
      };
      if (form.password?.trim()) payload.password = form.password.trim();

      const saved = await api.adminUpdateUser(userId, payload);
      setForm({ ...saved, password: "" });
      setLinkedinUrl(saved.social_links?.linkedin || "");
      setMessageType("success");
      setMessage("User updated.");
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!form.id || form.id === actor?.id) {
      setMessageType("error");
      setMessage("You cannot delete your own account here.");
      return;
    }
    const ok = window.confirm(
      `Delete ${form.name} (@${form.username}) permanently?\n\nTheir studies, projects, and media metadata will also be removed.`,
    );
    if (!ok) return;
    try {
      await api.adminDeleteUser(form.id);
      navigate("/admin/users", { replace: true });
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof ApiError ? err.message : "Delete failed.");
    }
  }

  if (loading) {
    return <p className="text-ink-500">Loading user…</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/admin/users"
            className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
          >
            <ArrowLeft className="h-4 w-4" />
            All users
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink-950">{form.name || "User"}</h1>
          <p className="mt-1 text-ink-500">
            @{form.username} · ID {form.id} · {form.case_study_count ?? 0} case studies ·{" "}
            {form.project_count ?? 0} projects
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Registered{" "}
            {form.created_at
              ? new Date(form.created_at).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "—"}
            {" · "}
            {form.signup_location?.trim() || form.location?.trim() || "No location set"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.username ? (
            <a
              href={`/u/${form.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <ExternalLink className="h-4 w-4" />
              Public portfolio
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={form.id === actor?.id}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Delete user
          </button>
        </div>
      </div>

      {message ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-field">Name</label>
            <input
              className="input-field"
              value={form.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input
              type="email"
              className="input-field"
              value={form.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label-field">Username</label>
            <input
              className="input-field"
              value={form.username || ""}
              onChange={(e) =>
                updateField("username", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              required
            />
          </div>
          <div>
            <label className="label-field">Role</label>
            <select
              className="input-field"
              value={form.role || "professional"}
              onChange={(e) => updateField("role", e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="professional">Professional</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div>
            <label className="label-field">Title</label>
            <input
              className="input-field"
              value={form.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Location</label>
            <input
              className="input-field"
              value={form.location || ""}
              onChange={(e) => updateField("location", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Contact email (public)</label>
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
            />
          </div>
        </div>

        <div>
          <label className="label-field">Bio</label>
          <textarea
            className="input-field min-h-[100px]"
            value={form.bio || ""}
            onChange={(e) => updateField("bio", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label-field">Avatar URL</label>
            <input
              className="input-field"
              value={form.avatar_url || ""}
              onChange={(e) => updateField("avatar_url", e.target.value)}
            />
            {form.avatar_url ? (
              <img
                src={resolveAssetUrl(form.avatar_url)}
                alt=""
                className="mt-2 h-16 w-16 rounded-xl object-cover"
              />
            ) : null}
          </div>
          <div>
            <label className="label-field">Cover URL</label>
            <input
              className="input-field"
              value={form.cover_image_url || ""}
              onChange={(e) => updateField("cover_image_url", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">CV URL</label>
            <input
              className="input-field"
              value={form.cv_url || ""}
              onChange={(e) => updateField("cv_url", e.target.value)}
            />
            {form.cv_url ? (
              <a
                href={resolveAssetUrl(form.cv_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm text-brand-600 hover:text-brand-700"
              >
                Open CV
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <label className="label-field">Reset password (optional)</label>
          <input
            type="text"
            className="input-field"
            value={form.password || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Leave blank to keep current password"
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
