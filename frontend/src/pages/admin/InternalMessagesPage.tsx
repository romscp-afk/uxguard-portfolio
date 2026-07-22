import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LockKeyhole, MailPlus, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type {
  InternalMessage,
  InternalMessageThread,
  InternalMessageUser,
} from "../../types";

function formatWhen(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function InternalMessagesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<InternalMessageThread[]>([]);
  const [availableUsers, setAvailableUsers] = useState<InternalMessageUser[]>([]);
  const [selected, setSelected] = useState<InternalMessageThread | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const selectedId = searchParams.get("thread");
  const unread = useMemo(
    () =>
      threads.reduce(
        (sum, thread) => sum + (isAdmin ? thread.unread_admin : thread.unread_user),
        0,
      ),
    [isAdmin, threads],
  );

  async function loadThreads() {
    try {
      const result = await api.listInternalMessageThreads();
      setThreads(result.threads || []);
      setAvailableUsers(result.users || []);
      return result.threads || [];
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load private messages.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function openThread(threadId: string, quiet = false) {
    if (!quiet) setThreadLoading(true);
    setError("");
    try {
      const result = await api.getInternalMessageThread(threadId);
      setSelected(result.thread);
      setMessages(result.messages || []);
      setThreads((current) =>
        current.map((thread) =>
          thread.id === result.thread.id
            ? {
                ...result.thread,
                unread_admin: isAdmin ? 0 : result.thread.unread_admin,
                unread_user: isAdmin ? result.thread.unread_user : 0,
              }
            : thread,
        ),
      );
    } catch (err) {
      if (!quiet) {
        setError(err instanceof ApiError ? err.message : "Could not open conversation.");
      }
    } finally {
      if (!quiet) setThreadLoading(false);
    }
  }

  useEffect(() => {
    void loadThreads().then((loaded) => {
      const requested = searchParams.get("thread");
      if (requested && loaded.some((thread) => thread.id === requested)) {
        void openThread(requested);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedId || selectedId === selected?.id) return;
    void openThread(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selected?.id) return;
    const timer = window.setInterval(() => {
      void openThread(selected.id, true);
      void loadThreads();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [selected?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selected?.id]);

  function selectThread(thread: InternalMessageThread) {
    setComposeOpen(false);
    setSearchParams({ thread: thread.id });
    if (selected?.id === thread.id) void openThread(thread.id);
  }

  function startCompose() {
    setComposeOpen(true);
    setSelected(null);
    setMessages([]);
    setSearchParams({});
    setSubject("");
    setComposeBody("");
    setRecipientId("");
  }

  async function createThread(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.createInternalMessageThread({
        subject: subject.trim(),
        body: composeBody.trim(),
        ...(isAdmin ? { recipient_user_id: Number(recipientId) } : {}),
      });
      setComposeOpen(false);
      setSelected(result.thread);
      setMessages(result.messages);
      setSearchParams({ thread: result.thread.id });
      setSubject("");
      setComposeBody("");
      setRecipientId("");
      await loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send private message.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || !replyBody.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.replyInternalMessageThread(selected.id, replyBody.trim());
      setSelected(result.thread);
      setMessages(result.messages);
      setReplyBody("");
      await loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send reply.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="-mx-1 flex h-[calc(100vh-2rem)] min-h-[600px] flex-col text-ink-900">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold text-ink-950">Private messages</h1>
            {unread > 0 ? (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                {unread}
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            Direct user–admin conversations. Content is AES-256-GCM encrypted at rest and sent over
            TLS; notification emails never include message text.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={startCompose}>
          <MailPlus className="h-4 w-4" />
          New message
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="card flex min-h-0 flex-1 overflow-hidden border-ink-200 p-0 shadow-sm">
        <aside
          className={`min-w-0 flex-col border-r border-ink-100 bg-white md:flex md:w-[330px] ${
            selected || composeOpen ? "hidden" : "flex w-full"
          }`}
        >
          <div className="border-b border-ink-100 bg-ink-50/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Conversations
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-sm text-ink-500">Loading messages…</p>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="mx-auto h-8 w-8 text-ink-300" />
                <p className="mt-3 text-sm font-medium text-ink-700">No conversations yet</p>
                <p className="mt-1 text-xs text-ink-500">
                  {isAdmin
                    ? "Start a private conversation with a specific user."
                    : "Send a private message to the admin team."}
                </p>
              </div>
            ) : (
              threads.map((thread) => {
                const count = isAdmin ? thread.unread_admin : thread.unread_user;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => selectThread(thread)}
                    className={`block w-full border-b border-ink-50 px-4 py-3 text-left transition hover:bg-ink-50 ${
                      selected?.id === thread.id ? "bg-brand-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`truncate text-sm text-ink-950 ${count ? "font-bold" : "font-medium"}`}>
                        {thread.subject}
                      </p>
                      {count ? (
                        <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                          {count}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-500">
                      {isAdmin ? thread.user?.name || thread.user?.email : "UXGuard Admin"}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      {formatWhen(thread.last_message_at)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main
          className={`min-w-0 flex-1 flex-col bg-ink-50/40 ${
            selected || composeOpen ? "flex" : "hidden md:flex"
          }`}
        >
          {composeOpen ? (
            <form className="flex h-full flex-col bg-white" onSubmit={createThread}>
              <div className="border-b border-ink-100 px-5 py-4">
                <button
                  type="button"
                  className="mb-2 text-xs font-semibold text-brand-700 md:hidden"
                  onClick={() => setComposeOpen(false)}
                >
                  ← Conversations
                </button>
                <h2 className="font-display text-xl font-bold text-ink-950">New private message</h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Stored encrypted; email notifications contain no message body.
                </div>
              </div>
              <div className="space-y-3 border-b border-ink-100 p-5">
                {isAdmin ? (
                  <select
                    className="input-field"
                    required
                    value={recipientId}
                    onChange={(event) => setRecipientId(event.target.value)}
                  >
                    <option value="">Choose a user…</option>
                    {availableUsers.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} · {candidate.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700">
                    To: UXGuard Admin
                  </div>
                )}
                <input
                  className="input-field"
                  placeholder="Subject"
                  required
                  maxLength={200}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
              <textarea
                className="min-h-0 flex-1 resize-none border-0 bg-white p-5 text-sm leading-relaxed text-ink-900 outline-none"
                placeholder="Write your message…"
                required
                maxLength={20000}
                value={composeBody}
                onChange={(event) => setComposeBody(event.target.value)}
              />
              <div className="flex gap-2 border-t border-ink-100 p-4">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    busy ||
                    !subject.trim() ||
                    !composeBody.trim() ||
                    (isAdmin && !recipientId)
                  }
                >
                  <Send className="h-4 w-4" />
                  {busy ? "Sending…" : "Send privately"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setComposeOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : selected ? (
            <>
              <div className="border-b border-ink-100 bg-white px-5 py-4">
                <button
                  type="button"
                  className="mb-2 text-xs font-semibold text-brand-700 md:hidden"
                  onClick={() => {
                    setSelected(null);
                    setSearchParams({});
                  }}
                >
                  ← Conversations
                </button>
                <h2 className="font-display text-xl font-bold text-ink-950">{selected.subject}</h2>
                <p className="mt-1 text-xs text-ink-500">
                  {isAdmin
                    ? `${selected.user?.name || "User"} · ${selected.user?.email || ""}`
                    : "Private conversation with UXGuard Admin"}
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                {threadLoading ? (
                  <p className="text-sm text-ink-500">Opening conversation…</p>
                ) : (
                  messages.map((message) => {
                    const mine = Number(message.sender_user_id) === Number(user?.id);
                    return (
                      <article
                        key={message.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          mine
                            ? "ml-auto rounded-br-md bg-ink-950 text-white"
                            : "rounded-bl-md border border-ink-100 bg-white text-ink-900"
                        }`}
                      >
                        <p className={`text-xs font-semibold ${mine ? "text-ink-200" : "text-ink-500"}`}>
                          {mine
                            ? "You"
                            : message.sender?.name ||
                              (message.sender_role === "admin" ? "UXGuard Admin" : "User")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                        <p className={`mt-2 text-[10px] ${mine ? "text-ink-300" : "text-ink-400"}`}>
                          {formatWhen(message.created_at)}
                        </p>
                      </article>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={sendReply} className="border-t border-ink-100 bg-white p-4">
                <div className="flex items-end gap-2">
                  <textarea
                    className="input-field min-h-[48px] flex-1 resize-y"
                    rows={2}
                    maxLength={20000}
                    placeholder="Write a private reply…"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (replyBody.trim() && !busy) event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="btn-primary h-12 px-4"
                    disabled={busy || !replyBody.trim()}
                    aria-label="Send reply"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <ShieldCheck className="h-10 w-10 text-brand-500" />
              <p className="mt-4 font-semibold text-ink-800">Private user–admin messaging</p>
              <p className="mt-1 max-w-sm text-sm text-ink-500">
                Select a conversation or start a new one. Each thread is restricted to its user and
                platform admins.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
