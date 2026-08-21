import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { CareerTimelineEntry, ResumeTimelineSelection } from "../../types";

type Props = {
  resumeId: number;
};

/**
 * Lets a resume select master timeline entries without writing back to the master profile.
 */
export function ResumeTimelinePanel({ resumeId }: Props) {
  const [entries, setEntries] = useState<CareerTimelineEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getResumeTimelineSelection(resumeId);
      setEntries(data.available_entries || []);
      setSelected(
        new Set(
          (data.selections || [])
            .filter((sel: ResumeTimelineSelection) => sel.is_included !== false)
            .map((sel) => Number(sel.timeline_entry_id)),
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load timeline selections.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [resumeId]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSavedMsg("");
  }

  async function save() {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const selections = [...selected].map((timeline_entry_id) => ({
        timeline_entry_id,
        is_included: true,
        resume_specific_content: null,
      }));
      await api.putResumeTimelineSelection(resumeId, selections);
      setSavedMsg("Timeline selection saved. Master career data was not overwritten.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save selection.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-500">Loading timeline…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Use Career Timeline</h3>
          <p className="text-xs text-ink-500">
            Select master entries for this resume. Edits here do not change the master timeline.
          </p>
        </div>
        <Link to="/admin/career-timeline" className="text-xs font-medium text-brand-700 hover:underline">
          Open timeline
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {savedMsg ? <p className="text-sm text-brand-800">{savedMsg}</p> : null}

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-200 px-3 py-4 text-sm text-ink-500">
          No master timeline entries yet.{" "}
          <Link to="/admin/career-timeline" className="text-brand-700 hover:underline">
            Import or add entries
          </Link>
          .
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {entries
            .filter((entry) => !entry.hidden)
            .map((entry) => (
              <li key={entry.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-100 px-3 py-2 hover:bg-ink-50">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(entry.id)}
                    onChange={() => toggle(entry.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink-900">{entry.title}</span>
                    <span className="block text-xs text-ink-500">
                      {entry.type.replace(/_/g, " ")}
                      {entry.organisation ? ` · ${entry.organisation}` : ""}
                      {entry.start_date ? ` · ${entry.start_date}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
        </ul>
      )}

      <button type="button" className="btn-primary text-sm" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save selection"}
      </button>
    </div>
  );
}
