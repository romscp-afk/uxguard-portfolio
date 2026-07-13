import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil, Search, Trash2 } from "lucide-react";
import { api, ApiError } from "../../../api/client";
import { ReadOnlyNotice } from "../../../components/platform/ReadOnlyNotice";
import type { AiConversation } from "../../../types";

export function AiHistoryPage() {
  const [items, setItems] = useState<AiConversation[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(search?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await api.listAiConversations({ q: search });
      setItems(res.conversations || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(q);
  }

  async function rename(id: string, current: string) {
    const title = window.prompt("Rename conversation", current);
    if (!title?.trim()) return;
    try {
      const updated = await api.renameAiConversation(id, title.trim());
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not rename.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this conversation and its messages?")) return;
    try {
      await api.deleteAiConversation(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
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
      <h1 className="font-display text-3xl font-bold text-ink-950">Conversation history</h1>
      <p className="mt-1 text-ink-500">Search, continue, rename or delete past AI conversations.</p>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="input-field pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title"
            aria-label="Search conversations"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mt-6 card overflow-hidden">
        {loading ? (
          <div className="h-40 animate-pulse bg-ink-50" />
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-500">
            Empty history. Generate something from the AI hub to see it here.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/ai/${item.assistant_type}?conversation=${item.id}`}
                    className="font-medium text-ink-900 hover:text-brand-700"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs capitalize text-ink-400">
                    {String(item.assistant_type).replace(/-/g, " ")} ·{" "}
                    {new Date(item.updated_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary py-1.5 text-xs"
                  onClick={() => rename(item.id, item.title)}
                  aria-label={`Rename ${item.title}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  onClick={() => remove(item.id)}
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
