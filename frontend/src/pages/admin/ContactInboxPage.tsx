import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCheck,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  MailPlus,
  PenSquare,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import type { ContactMailboxCounts, ContactMessage } from "../../types";

type FolderKey = "inbox" | "sent" | "drafts" | "trash" | "starred";

const FOLDERS: { id: FolderKey; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: PenSquare },
  { id: "trash", label: "Trash", icon: Trash2 },
];

const EMPTY_COUNTS: ContactMailboxCounts = {
  inbox: 0,
  inbox_unread: 0,
  sent: 0,
  drafts: 0,
  trash: 0,
  starred: 0,
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function counterparty(msg: ContactMessage) {
  if (msg.direction === "outbound") {
    return msg.to_name || msg.to_email || msg.name || msg.email;
  }
  return msg.from_name || msg.name || msg.from_email || msg.email;
}

export function ContactInboxPage() {
  const [folder, setFolder] = useState<FolderKey>("inbox");
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<ContactMailboxCounts>(EMPTY_COUNTS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<ContactMessage[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeToName, setComposeToName] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const [replyBody, setReplyBody] = useState("");

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) || thread.find((m) => m.id === selectedId) || null,
    [messages, thread, selectedId],
  );

  async function loadList(nextFolder = folder, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const result = await api.getContactMessages({
        folder: nextFolder,
        q: nextQuery.trim() || undefined,
      });
      setMessages(result.messages || []);
      if (result.counts) setCounts(result.counts);
      setSelectedIds([]);
      if (selectedId && !(result.messages || []).some((m) => m.id === selectedId)) {
        setSelectedId(null);
        setThread([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load mailbox.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList(folder, query);
  }, [folder]);

  async function openMessage(msg: ContactMessage) {
    setSelectedId(msg.id);
    setDetailLoading(true);
    setReplyBody("");
    setComposeOpen(false);
    try {
      const detail = await api.getContactMessage(msg.id);
      setThread(detail.thread?.length ? detail.thread : [detail.message]);
      if (!msg.read && msg.folder === "inbox") {
        const updated = await api.updateContactMessage(msg.id, { read: true });
        if (updated.counts) setCounts(updated.counts);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)),
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open message.");
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (selectedIds.length === messages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
  }

  async function runBulk(action: string, extra: Record<string, unknown> = {}) {
    const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
    if (!ids.length && action !== "empty_trash") return;
    setBusy(true);
    setError("");
    try {
      const result = await api.mailboxAction({ action, ids, ...extra });
      if (result.counts) setCounts(result.counts);
      await loadList(folder, query);
      if (selectedId && ids.includes(selectedId)) {
        setSelectedId(null);
        setThread([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStar(msg: ContactMessage) {
    try {
      const updated = await api.updateContactMessage(msg.id, { starred: !msg.starred });
      if (updated.counts) setCounts(updated.counts);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, starred: !msg.starred } : m)),
      );
      setThread((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, starred: !msg.starred } : m)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update star.");
    }
  }

  async function handleDelete(msg: ContactMessage) {
    setBusy(true);
    try {
      const permanent = folder === "trash";
      const result = await api.deleteContactMessage(msg.id, permanent);
      if (result.counts) setCounts(result.counts);
      await loadList(folder, query);
      if (selectedId === msg.id) {
        setSelectedId(null);
        setThread([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!selected || !replyBody.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.replyContactMessage(selected.id, {
        message: replyBody.trim(),
        subject: selected.subject.startsWith("Re:") ? selected.subject : `Re: ${selected.subject}`,
      });
      if (result.counts) setCounts(result.counts);
      setThread(result.thread || []);
      setReplyBody("");
      if (folder === "sent") await loadList("sent", query);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send reply.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCompose(e: FormEvent, asDraft = false) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.mailboxAction({
        action: asDraft ? "draft" : "compose",
        toEmail: composeTo.trim(),
        toName: composeToName.trim(),
        subject: composeSubject.trim(),
        message: composeBody.trim(),
      });
      if (result.counts) setCounts(result.counts);
      setComposeOpen(false);
      setComposeTo("");
      setComposeToName("");
      setComposeSubject("");
      setComposeBody("");
      const nextFolder = asDraft ? "drafts" : "sent";
      setFolder(nextFolder);
      await loadList(nextFolder, "");
      if (result.message) {
        setSelectedId(result.message.id);
        setThread([result.message]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  function startReply() {
    if (!selected) return;
    setComposeOpen(false);
    setReplyBody("");
  }

  function startCompose() {
    setSelectedId(null);
    setThread([]);
    setComposeOpen(true);
    setComposeTo("");
    setComposeToName("");
    setComposeSubject("");
    setComposeBody("");
  }

  const folderCount = (id: FolderKey) => {
    if (id === "inbox") return counts.inbox_unread || counts.inbox;
    if (id === "sent") return counts.sent;
    if (id === "drafts") return counts.drafts;
    if (id === "trash") return counts.trash;
    if (id === "starred") return counts.starred;
    return 0;
  };

  return (
    <div className="-mx-1 flex h-[calc(100vh-2rem)] min-h-[560px] flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Mail</h1>
          <p className="mt-1 text-sm text-ink-500">
            Contact form inbox for UXGuard Studio. Replies are saved in Sent (portal mail — no external
            email required).
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={startCompose}>
          <MailPlus className="h-4 w-4" />
          Compose
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="card flex min-h-0 flex-1 overflow-hidden border-ink-200 p-0 shadow-sm">
        {/* Folder rail */}
        <aside className="hidden w-48 shrink-0 border-r border-ink-100 bg-ink-50/80 p-3 md:block">
          <button type="button" className="btn-primary mb-4 w-full justify-center" onClick={startCompose}>
            <PenSquare className="h-4 w-4" />
            Compose
          </button>
          <nav className="space-y-1" aria-label="Mail folders">
            {FOLDERS.map(({ id, label, icon: Icon }) => {
              const active = folder === id;
              const count = folderCount(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setFolder(id);
                    setComposeOpen(false);
                    setSelectedId(null);
                    setThread([]);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  {count > 0 ? (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-semibold ${
                        active ? "bg-white/20 text-white" : "bg-ink-200 text-ink-700"
                      }`}
                    >
                      {id === "inbox" ? counts.inbox_unread || count : count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          {folder === "trash" && counts.trash > 0 ? (
            <button
              type="button"
              className="mt-4 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50"
              disabled={busy}
              onClick={() => runBulk("empty_trash")}
            >
              Empty trash
            </button>
          ) : null}
        </aside>

        {/* Message list */}
        <section
          className={`min-w-0 flex-col border-r border-ink-100 ${
            selectedId || composeOpen ? "hidden md:flex md:w-[340px] lg:w-[380px]" : "flex w-full md:w-[340px] lg:w-[380px]"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-ink-100 p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadList(folder, query);
                }}
                className="input-field pl-9 text-sm"
                placeholder="Search mail"
                aria-label="Search mail"
              />
            </div>
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-xs"
              onClick={() => loadList(folder, query)}
            >
              Go
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b border-ink-100 px-2 py-1.5">
            <label className="flex items-center gap-2 px-2 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={messages.length > 0 && selectedIds.length === messages.length}
                onChange={toggleSelectAll}
              />
              All
            </label>
            <button
              type="button"
              className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"
              title="Mark read"
              disabled={busy}
              onClick={() => runBulk("bulk_read")}
            >
              <MailOpen className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"
              title="Mark unread"
              disabled={busy}
              onClick={() => runBulk("bulk_unread")}
            >
              <Mail className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"
              title="Star"
              disabled={busy}
              onClick={() => runBulk("bulk_star")}
            >
              <Star className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"
              title={folder === "trash" ? "Delete forever" : "Move to trash"}
              disabled={busy}
              onClick={() =>
                folder === "trash"
                  ? runBulk("bulk_delete", { permanent: true })
                  : runBulk("bulk_trash")
              }
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="ml-auto flex gap-1 md:hidden">
              {FOLDERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFolder(id)}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${
                    folder === id ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : messages.length === 0 ? (
              <div className="p-10 text-center">
                <Archive className="mx-auto h-8 w-8 text-ink-300" />
                <p className="mt-3 text-sm text-ink-500">No messages in {folder}.</p>
              </div>
            ) : (
              <ul role="listbox" aria-label={`${folder} messages`}>
                {messages.map((msg) => {
                  const active = selectedId === msg.id;
                  const checked = selectedIds.includes(msg.id);
                  return (
                    <li key={msg.id} className="border-b border-ink-50">
                      <div
                        className={`flex gap-2 px-2 py-2.5 transition ${
                          active ? "bg-brand-50" : msg.read ? "bg-white hover:bg-ink-50" : "bg-white hover:bg-brand-50/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleSelect(msg.id)}
                          aria-label={`Select ${msg.subject}`}
                        />
                        <button
                          type="button"
                          className="mt-0.5 text-amber-500"
                          onClick={() => toggleStar(msg)}
                          aria-label={msg.starred ? "Unstar" : "Star"}
                        >
                          <Star className={`h-4 w-4 ${msg.starred ? "fill-amber-400" : ""}`} />
                        </button>
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => openMessage(msg)}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={`truncate text-sm ${
                                msg.read ? "font-medium text-ink-700" : "font-bold text-ink-950"
                              }`}
                            >
                              {counterparty(msg)}
                            </p>
                            <time className="shrink-0 text-[11px] text-ink-400">
                              {formatWhen(msg.created_at)}
                            </time>
                          </div>
                          <p
                            className={`truncate text-sm ${
                              msg.read ? "text-ink-600" : "font-semibold text-ink-900"
                            }`}
                          >
                            {msg.subject}
                          </p>
                          <p className="truncate text-xs text-ink-400">{msg.message}</p>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Reading / compose pane */}
        <section
          className={`min-w-0 flex-1 flex-col bg-white ${
            selectedId || composeOpen ? "flex" : "hidden md:flex"
          }`}
        >
          {composeOpen ? (
            <form className="flex h-full flex-col" onSubmit={(e) => handleCompose(e, false)}>
              <div className="border-b border-ink-100 px-5 py-4">
                <h2 className="font-display text-xl font-bold text-ink-950">New message</h2>
                <p className="mt-1 text-xs text-ink-500">
                  Stored in Sent inside the portal. External email delivery can be enabled later.
                </p>
              </div>
              <div className="space-y-3 border-b border-ink-100 px-5 py-4">
                <input
                  className="input-field"
                  placeholder="To email"
                  type="email"
                  required
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                />
                <input
                  className="input-field"
                  placeholder="To name (optional)"
                  value={composeToName}
                  onChange={(e) => setComposeToName(e.target.value)}
                />
                <input
                  className="input-field"
                  placeholder="Subject"
                  required
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </div>
              <textarea
                className="input-field min-h-0 flex-1 resize-none rounded-none border-0 focus:ring-0"
                placeholder="Write your message…"
                required
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 border-t border-ink-100 px-5 py-3">
                <button type="submit" className="btn-primary" disabled={busy}>
                  <Send className="h-4 w-4" />
                  Send
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={(e) => handleCompose(e, true)}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setComposeOpen(false)}
                >
                  Discard
                </button>
              </div>
            </form>
          ) : !selected ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <CheckCheck className="h-10 w-10 text-ink-300" />
              <p className="mt-4 font-medium text-ink-700">Select a message to read</p>
              <p className="mt-1 max-w-sm text-sm text-ink-500">
                Choose a conversation from the list, or compose a new message to someone who contacted
                you.
              </p>
            </div>
          ) : detailLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <div className="min-w-0">
                  <button
                    type="button"
                    className="mb-2 text-xs font-medium text-brand-600 md:hidden"
                    onClick={() => {
                      setSelectedId(null);
                      setThread([]);
                    }}
                  >
                    ← Back to list
                  </button>
                  <h2 className="font-display text-xl font-bold text-ink-950">{selected.subject}</h2>
                  <p className="mt-1 text-sm text-ink-500">
                    {selected.inquiry_type} · Thread {selected.thread_id}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    onClick={() => {
                      startReply();
                      document.getElementById("mail-reply")?.focus();
                    }}
                  >
                    <Reply className="h-4 w-4" />
                    Reply
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    onClick={() => toggleStar(selected)}
                  >
                    <Star className={`h-4 w-4 ${selected.starred ? "fill-amber-400 text-amber-500" : ""}`} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={busy}
                    onClick={() => handleDelete(selected)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {folder === "trash" ? "Delete forever" : "Delete"}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {thread.map((msg) => (
                  <article
                    key={msg.id}
                    className={`rounded-xl border p-4 ${
                      msg.direction === "outbound"
                        ? "border-brand-100 bg-brand-50/40"
                        : "border-ink-100 bg-ink-50/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink-900">
                          {msg.from_name || msg.name}
                          <span className="ml-2 font-normal text-ink-500">
                            &lt;{msg.from_email || msg.email}&gt;
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          To: {msg.to_name || msg.to_email} · {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                        {msg.direction === "outbound" ? "Sent" : "Received"}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
                      {msg.message}
                    </p>
                  </article>
                ))}
              </div>

              <form onSubmit={handleReply} className="border-t border-ink-100 bg-ink-50/60 p-4">
                <label htmlFor="mail-reply" className="label-field">
                  Reply
                </label>
                <textarea
                  id="mail-reply"
                  className="input-field mt-1 min-h-[110px] resize-y"
                  placeholder={`Reply to ${counterparty(selected)}…`}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  required
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="submit" className="btn-primary" disabled={busy || !replyBody.trim()}>
                    <Send className="h-4 w-4" />
                    Send reply
                  </button>
                  <p className="self-center text-xs text-ink-400">
                    Reply is saved to Sent in this mailbox.
                  </p>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
