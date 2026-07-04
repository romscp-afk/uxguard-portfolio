import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { api } from "../../api/client";
import type { PortfolioSettings } from "../../types";

export function PortfolioSettingsPage() {
  const [form, setForm] = useState<PortfolioSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.getPortfolioSettings().then(setForm);
  }, []);

  function updateField<K extends keyof PortfolioSettings>(key: K, value: PortfolioSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.updatePortfolioSettings(form);
      setForm(updated);
      setMessage("Settings saved.");
    } catch {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return <div className="card h-64 animate-pulse bg-ink-100" />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-950">Portfolio Settings</h1>
        <p className="mt-1 text-ink-500">Customize your public portfolio homepage</p>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="card max-w-2xl p-6">
        <div className="space-y-4">
          <div>
            <label className="label-field">Site Title</label>
            <input
              className="input-field"
              value={form.site_title}
              onChange={(e) => updateField("site_title", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Tagline</label>
            <input
              className="input-field"
              value={form.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Hero Title</label>
            <input
              className="input-field"
              value={form.hero_title}
              onChange={(e) => updateField("hero_title", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Hero Subtitle</label>
            <textarea
              className="input-field min-h-[80px]"
              value={form.hero_subtitle}
              onChange={(e) => updateField("hero_subtitle", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">About Section</label>
            <textarea
              className="input-field min-h-[120px]"
              value={form.about}
              onChange={(e) => updateField("about", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Contact Email</label>
            <input
              type="email"
              className="input-field"
              value={form.contact_email || ""}
              onChange={(e) => updateField("contact_email", e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary mt-6" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
