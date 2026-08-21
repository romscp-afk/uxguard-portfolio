import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { api, ApiError } from "../../../api/client";
import { ReadOnlyNotice } from "../../../components/platform/ReadOnlyNotice";
import { contentToMarkdown } from "../../../lib/aiAssistants";
import type { SavedAiOutput } from "../../../types";

export function AiSavedPage() {
  const [items, setItems] = useState<SavedAiOutput[]>([]);
  const [selected, setSelected] = useState<SavedAiOutput | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listSavedAiOutputs()
      .then((res) => {
        setItems(res.outputs || []);
        setSelected(res.outputs?.[0] || null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load saved outputs."))
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this saved output?")) return;
    try {
      await api.deleteSavedAiOutput(id);
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        setSelected(next[0] || null);
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    }
  }

  return (
    <div>
      <ReadOnlyNotice />
      <Link
        to="/admin/ai"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        UXGuard AI
      </Link>
      <h1 className="font-display text-3xl font-bold text-ink-950">Saved AI outputs</h1>
      <p className="mt-1 text-ink-500">Outputs you explicitly saved from a workspace.</p>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card mt-6 h-48 animate-pulse bg-ink-100" />
      ) : items.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-sm text-ink-500">
          No saved outputs yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <ul className="card divide-y divide-ink-100 lg:col-span-4">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`w-full px-4 py-3 text-left text-sm ${
                    selected?.id === item.id ? "bg-brand-50" : "hover:bg-ink-50"
                  }`}
                >
                  <p className="font-medium text-ink-900">{item.title}</p>
                  <p className="text-xs text-ink-400">{item.output_type}</p>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <div className="card p-6 lg:col-span-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink-900">{selected.title}</h2>
                  <p className="text-xs text-ink-400">
                    {new Date(selected.updated_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  onClick={() => remove(selected.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
              <pre className="mt-4 max-h-[560px] overflow-auto whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-sm text-ink-800">
                {contentToMarkdown(
                  typeof selected.content === "object"
                    ? selected.content
                    : { markdown: String(selected.content) },
                )}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
