import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../../api/client";
import { EditGuard, ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import type { CareerTimelineEntry, CareerTimelineType } from "../../types";

const TYPES: CareerTimelineType[] = [
  "employment",
  "promotion",
  "education",
  "project",
  "certification",
  "award",
  "volunteering",
  "career_break",
  "milestone",
  "custom",
];

const EMPTY: Partial<CareerTimelineEntry> = {
  type: "employment",
  title: "",
  organisation: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
  achievements: [],
  skills: [],
  employment_type: "",
  working_arrangement: "",
  visibility: "private",
  hidden: false,
};

export function CareerTimelineEntryPage() {
  const { entryId } = useParams();
  const isNew = !entryId || entryId === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<CareerTimelineEntry>>(EMPTY);
  const [achievementsText, setAchievementsText] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api
      .getCareerTimelineEntry(Number(entryId))
      .then((data) => {
        setForm(data.entry);
        setAchievementsText((data.entry.achievements || []).join("\n"));
        setSkillsText((data.entry.skills || []).join(", "));
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load entry.");
      })
      .finally(() => setLoading(false));
  }, [entryId, isNew]);

  function setField<K extends keyof CareerTimelineEntry>(key: K, value: CareerTimelineEntry[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    const payload: Partial<CareerTimelineEntry> = {
      ...form,
      achievements: achievementsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      skills: skillsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    try {
      if (isNew) {
        const data = await api.createCareerTimelineEntry(payload);
        navigate(`/admin/career-timeline/${data.entry.id}`, { replace: true });
      } else {
        const data = await api.updateCareerTimelineEntry(Number(entryId), payload);
        setForm(data.entry);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to="/admin/career-timeline"
          className="inline-flex items-center gap-2 text-sm text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" /> Career Timeline
        </Link>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-950">
          {isNew ? "Add milestone" : "Edit timeline entry"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Changes update your master career profile. Resume-specific copies stay separate until you sync.
        </p>
      </div>

      <ReadOnlyNotice />
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <EditGuard>
        <div className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Type</span>
            <select
              className="input-field"
              value={form.type || "employment"}
              onChange={(e) => setField("type", e.target.value as CareerTimelineType)}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Title</span>
            <input
              className="input-field"
              value={form.title || ""}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Role, qualification, or milestone"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Organisation</span>
            <input
              className="input-field"
              value={form.organisation || ""}
              onChange={(e) => setField("organisation", e.target.value)}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-800">Start date</span>
              <input
                className="input-field"
                value={form.start_date || ""}
                onChange={(e) => setField("start_date", e.target.value)}
                placeholder="YYYY-MM or YYYY"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-800">End date</span>
              <input
                className="input-field"
                value={form.end_date || ""}
                onChange={(e) => setField("end_date", e.target.value)}
                disabled={Boolean(form.is_current)}
                placeholder="YYYY-MM or YYYY"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              checked={Boolean(form.is_current)}
              onChange={(e) => setField("is_current", e.target.checked)}
            />
            Currently ongoing
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Location</span>
            <input
              className="input-field"
              value={form.location || ""}
              onChange={(e) => setField("location", e.target.value)}
            />
          </label>

          {form.type === "employment" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ink-800">Employment type</span>
                <input
                  className="input-field"
                  value={form.employment_type || ""}
                  onChange={(e) => setField("employment_type", e.target.value)}
                  placeholder="Full-time, contract…"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ink-800">Working arrangement</span>
                <input
                  className="input-field"
                  value={form.working_arrangement || ""}
                  onChange={(e) => setField("working_arrangement", e.target.value)}
                  placeholder="Remote, hybrid, onsite"
                />
              </label>
            </div>
          ) : null}

          {form.type === "career_break" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-800">Reason (optional, private)</span>
              <input
                className="input-field"
                value={form.break_reason || ""}
                onChange={(e) => setField("break_reason", e.target.value)}
              />
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Description</span>
            <textarea
              className="input-field min-h-[100px]"
              value={form.description || ""}
              onChange={(e) => setField("description", e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Achievements (one per line)</span>
            <textarea
              className="input-field min-h-[100px]"
              value={achievementsText}
              onChange={(e) => setAchievementsText(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Skills (comma separated)</span>
            <input
              className="input-field"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-800">Entry visibility</span>
            <select
              className="input-field"
              value={form.visibility || "private"}
              onChange={(e) =>
                setField("visibility", e.target.value as CareerTimelineEntry["visibility"])
              }
            >
              <option value="private">Private</option>
              <option value="employers">Employers only</option>
              <option value="public">Public</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <Link to="/admin/career-timeline" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </div>
      </EditGuard>
    </div>
  );
}
