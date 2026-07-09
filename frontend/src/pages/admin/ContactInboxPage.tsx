import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api, ApiError } from "../../api/client";
import type { ContactMessage } from "../../types";

export function ContactInboxPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await api.getContactMessages();
        if (!cancelled) setMessages(result.messages);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load contact messages.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-950">Contact Inbox</h1>
        <p className="mt-1 text-ink-500">
          Messages from the public contact form. Stored securely in your platform data.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card h-40 animate-pulse bg-ink-100" />
      ) : messages.length === 0 ? (
        <div className="card p-12 text-center">
          <Mail className="mx-auto h-10 w-10 text-ink-300" />
          <p className="mt-4 text-sm text-ink-500">No contact messages yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <article key={message.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{message.subject}</p>
                  <p className="mt-1 text-sm text-ink-500">
                    {message.name} ·{" "}
                    <a href={`mailto:${message.email}`} className="text-brand-600 hover:text-brand-500">
                      {message.email}
                    </a>
                  </p>
                </div>
                <div className="text-right text-xs text-ink-400">
                  <p>{message.inquiry_type}</p>
                  <p className="mt-1">{new Date(message.created_at).toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {message.message}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
