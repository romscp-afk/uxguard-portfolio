import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  LockKeyhole,
  MailPlus,
  MessageCircle,
  Pencil,
  Phone,
  Send,
  Smile,
  Trash2,
  Video,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import { CallOverlay } from "../../components/messages/CallOverlay";
import { useAuth } from "../../context/AuthContext";
import { usePeerCall } from "../../hooks/usePeerCall";
import { compressImageForChat } from "../../lib/compressChatImage";
import type {
  InternalMessage,
  InternalMessageAttachment,
  InternalMessageThread,
  InternalMessageUser,
} from "../../types";

const EMOJIS = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤔",
  "😮",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "🔥",
  "✨",
  "🎉",
  "❤️",
  "✅",
  "📌",
  "📷",
];

function formatWhen(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isTerminalCallStatus(status?: string) {
  return status === "ended" || status === "rejected" || status === "missed" || status === "failed";
}

function threadTitle(thread: InternalMessageThread, selfId?: number) {
  const other =
    thread.counterpart ||
    thread.participants?.find((p) => Number(p.id) !== Number(selfId)) ||
    thread.user;
  return other?.name || other?.email || thread.subject || "Chat";
}

export function InternalMessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<InternalMessageThread[]>([]);
  const [availableUsers, setAvailableUsers] = useState<InternalMessageUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [composeEmojiOpen, setComposeEmojiOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<InternalMessageAttachment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seenIncomingRef = useRef<Set<string>>(new Set());

  const {
    phase: callPhase,
    activeCall,
    muted,
    cameraOff,
    elapsedSec,
    busyAction,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptIncoming,
    rejectIncoming,
    hangup,
    attachIncoming,
    toggleMute,
    toggleCamera,
  } = usePeerCall({
    selfId: user?.id,
    onError: (message) => setError(message),
  });

  const prevCallPhaseRef = useRef<typeof callPhase>("idle");

  const selectedId = searchParams.get("thread");
  const callIdParam = searchParams.get("call");
  const unread = useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0),
    [threads],
  );
  const filteredUsers = useMemo(() => {
    const needle = userQuery.trim().toLowerCase();
    if (!needle) return availableUsers.slice(0, 40);
    return availableUsers
      .filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(needle) ||
          candidate.email.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [availableUsers, userQuery]);

  async function loadThreads() {
    try {
      const result = await api.listInternalMessageThreads();
      setThreads(result.threads || []);
      setAvailableUsers(result.users || []);
      return result.threads || [];
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load messages.");
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
          thread.id === result.thread.id ? { ...result.thread, unread_count: 0 } : thread,
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

  useEffect(() => {
    let cancelled = false;
    async function pollCalls() {
      try {
        const result = await api.listActiveCalls();
        if (cancelled) return;
        const incoming = result.calls.find(
          (item) =>
            item.status === "ringing" &&
            Number(item.callee_user_id) === Number(user?.id) &&
            !seenIncomingRef.current.has(item.id),
        );
        if (incoming && (callPhase === "idle" || activeCall?.id === incoming.id)) {
          if (callPhase === "idle") {
            seenIncomingRef.current.add(incoming.id);
          }
          attachIncoming(incoming, result.ice_servers);
          if (!selectedId || selectedId !== incoming.thread_id) {
            setSearchParams({ thread: incoming.thread_id, call: incoming.id });
          }
        }
        if (callIdParam) {
          const match = result.calls.find((item) => item.id === callIdParam);
          if (
            match &&
            Number(match.callee_user_id) === Number(user?.id) &&
            match.status === "ringing" &&
            (callPhase === "idle" || activeCall?.id === match.id)
          ) {
            seenIncomingRef.current.add(match.id);
            attachIncoming(match, result.ice_servers);
          }
        }
        // Caller: close overlay when callee rejects or call ends
        if (
          activeCall?.id &&
          Number(activeCall.caller_user_id) === Number(user?.id) &&
          (callPhase === "outgoing" || callPhase === "connecting")
        ) {
          const mine = result.calls.find((item) => item.id === activeCall.id);
          if (mine && isTerminalCallStatus(mine.status)) {
            hangup();
          } else if (!mine) {
            try {
              const snapshot = await api.getCall(activeCall.id);
              if (isTerminalCallStatus(snapshot.call.status)) {
                hangup();
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // best effort
      }
    }
    void pollCalls();
    const timer = window.setInterval(() => void pollCalls(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    user?.id,
    callPhase,
    callIdParam,
    selectedId,
    activeCall?.id,
    activeCall?.caller_user_id,
    setSearchParams,
    attachIncoming,
    hangup,
  ]);

  useEffect(() => {
    const wasActive = prevCallPhaseRef.current !== "idle";
    prevCallPhaseRef.current = callPhase;
    if (!wasActive || callPhase !== "idle" || !callIdParam) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("call");
        return next;
      },
      { replace: true },
    );
  }, [callPhase, callIdParam, setSearchParams]);

  function clearPendingAttachments() {
    setPendingAttachments((prev) => {
      for (const attachment of prev) {
        if (attachment.preview_url?.startsWith("blob:")) {
          URL.revokeObjectURL(attachment.preview_url);
        }
      }
      return [];
    });
  }

  function attachmentsForApi(list: InternalMessageAttachment[]) {
    return list.map(({ url, pathname, mime_type, size_bytes, name, width, height }) => ({
      url,
      pathname,
      mime_type,
      size_bytes,
      name,
      width,
      height,
    }));
  }

  function selectThread(thread: InternalMessageThread) {
    setComposeOpen(false);
    clearPendingAttachments();
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
    clearPendingAttachments();
    setUserQuery("");
  }

  async function uploadChatImage(file: File) {
    const { file: compressed, width, height, compressed: didCompress } =
      await compressImageForChat(file);
    const asset = await api.uploadChatAttachment(compressed);
    const previewUrl = URL.createObjectURL(compressed);
    return {
      url: asset.url,
      pathname: asset.pathname,
      mime_type: asset.mime_type || compressed.type,
      size_bytes: asset.size_bytes || compressed.size,
      name: asset.name || compressed.name,
      width,
      height,
      preview_url: previewUrl,
      _notice: didCompress ? "Image compressed to under 500 KB." : undefined,
    } as InternalMessageAttachment & { _notice?: string };
  }

  async function onPickImage(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const attachment = await uploadChatImage(file);
      setPendingAttachments((prev) => [...prev, attachment].slice(0, 4));
      if ((attachment as { _notice?: string })._notice) {
        setError((attachment as { _notice?: string })._notice || "");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function createThread(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.createInternalMessageThread({
        subject: subject.trim() || undefined,
        body: composeBody.trim(),
        recipient_user_id: Number(recipientId),
        attachments: attachmentsForApi(pendingAttachments),
      });
      setComposeOpen(false);
      setSelected(result.thread);
      setMessages(result.messages);
      setSearchParams({ thread: result.thread.id });
      setSubject("");
      setComposeBody("");
      setRecipientId("");
      clearPendingAttachments();
      await loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected || (!replyBody.trim() && !pendingAttachments.length)) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.replyInternalMessageThread(selected.id, {
        body: replyBody.trim(),
        attachments: attachmentsForApi(pendingAttachments),
      });
      setSelected(result.thread);
      setMessages(result.messages);
      setReplyBody("");
      clearPendingAttachments();
      setEmojiOpen(false);
      await loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send reply.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(messageId: string) {
    if (!editBody.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.editInternalMessage(messageId, editBody.trim());
      setMessages(result.messages);
      setSelected(result.thread);
      setEditingId(null);
      setEditBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not edit message.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMessage(message: InternalMessage, scope: "me" | "all") {
    setBusy(true);
    setError("");
    try {
      await api.deleteInternalMessage(message.id, scope);
      if (selected) await openThread(selected.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete message.");
    } finally {
      setBusy(false);
    }
  }

  async function removeThread(threadId: string) {
    if (!window.confirm("Hide this conversation for you? Others keep their copy.")) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteInternalMessageThread(threadId);
      setSelected(null);
      setMessages([]);
      setSearchParams({});
      await loadThreads();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete chat.");
    } finally {
      setBusy(false);
    }
  }

  function insertEmoji(emoji: string, target: "reply" | "compose") {
    if (target === "reply") setReplyBody((value) => `${value}${emoji}`);
    else setComposeBody((value) => `${value}${emoji}`);
  }

  return (
    <div className="-mx-1 flex h-[calc(100vh-2rem)] min-h-[600px] flex-col text-ink-900">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold text-ink-950">Messages</h1>
            {unread > 0 ? (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                {unread}
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            Chat with any UXGuard member. Share emojis and images (auto-compressed under 500 KB).
            Edit your sent messages, or hide any message just for you.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={startCompose}>
          <MailPlus className="h-4 w-4" />
          New chat
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
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
                <p className="mt-1 text-xs text-ink-500">Start a chat with any member.</p>
              </div>
            ) : (
              threads.map((thread) => {
                const count = thread.unread_count || 0;
                return (
                  <div
                    key={thread.id}
                    className={`flex items-stretch border-b border-ink-50 ${
                      selected?.id === thread.id ? "bg-brand-50" : "hover:bg-ink-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectThread(thread)}
                      className="min-w-0 flex-1 px-4 py-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`truncate text-sm text-ink-950 ${
                            count ? "font-bold" : "font-medium"
                          }`}
                        >
                          {threadTitle(thread, user?.id)}
                        </p>
                        {count ? (
                          <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                            {count}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-ink-500">{thread.subject}</p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        {formatWhen(thread.last_message_at)}
                      </p>
                    </button>
                    <button
                      type="button"
                      className="px-3 text-ink-400 hover:text-red-600"
                      title="Hide chat for me"
                      onClick={() => void removeThread(thread.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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
                <h2 className="font-display text-xl font-bold text-ink-950">New chat</h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Encrypted at rest · images auto-compressed under 500 KB
                </div>
              </div>
              <div className="space-y-3 border-b border-ink-100 p-5">
                <input
                  className="input-field"
                  placeholder="Search people by name or email"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                />
                <select
                  className="input-field"
                  required
                  value={recipientId}
                  onChange={(event) => setRecipientId(event.target.value)}
                >
                  <option value="">Choose a member…</option>
                  {filteredUsers.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · {candidate.email}
                    </option>
                  ))}
                </select>
                <input
                  className="input-field"
                  placeholder="Subject (optional)"
                  maxLength={200}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
              <textarea
                className="min-h-0 flex-1 resize-none border-0 bg-white p-5 text-sm leading-relaxed text-ink-900 outline-none"
                placeholder="Write your message…"
                maxLength={20000}
                value={composeBody}
                onChange={(event) => setComposeBody(event.target.value)}
              />
              <AttachmentStrip
                attachments={pendingAttachments}
                onRemove={(index) =>
                  setPendingAttachments((prev) => {
                    const target = prev[index];
                    if (target?.preview_url?.startsWith("blob:")) {
                      URL.revokeObjectURL(target.preview_url);
                    }
                    return prev.filter((_, i) => i !== index);
                  })
                }
              />
              <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 p-4">
                <EmojiMenu
                  open={composeEmojiOpen}
                  onToggle={() => setComposeEmojiOpen((v) => !v)}
                  onPick={(emoji) => insertEmoji(emoji, "compose")}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy || pendingAttachments.length >= 4}
                >
                  <ImagePlus className="h-4 w-4" />
                  Image
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    busy ||
                    !recipientId ||
                    (!composeBody.trim() && !pendingAttachments.length)
                  }
                >
                  <Send className="h-4 w-4" />
                  {busy ? "Sending…" : "Send"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setComposeOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : selected ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-ink-100 bg-white px-5 py-4">
                <div>
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
                  <h2 className="font-display text-xl font-bold text-ink-950">
                    {threadTitle(selected, user?.id)}
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {selected.counterpart?.email || selected.user?.email || selected.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={busy || callPhase !== "idle"}
                    onClick={() => void startCall(selected.id, false)}
                    title="Voice call"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Call</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    disabled={busy || callPhase !== "idle"}
                    onClick={() => void startCall(selected.id, true)}
                    title="Video call"
                  >
                    <Video className="h-4 w-4" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    onClick={() => void removeThread(selected.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hide chat
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                {threadLoading ? (
                  <p className="text-sm text-ink-500">Opening conversation…</p>
                ) : (
                  messages.map((message) => {
                    const mine = Number(message.sender_user_id) === Number(user?.id);
                    if (message.deleted) {
                      return (
                        <article
                          key={message.id}
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm italic text-ink-400 ${
                            mine ? "ml-auto bg-ink-100" : "bg-white"
                          }`}
                        >
                          Message deleted
                        </article>
                      );
                    }
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
                          {mine ? "You" : message.sender?.name || "Member"}
                        </p>
                        {editingId === message.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
                              rows={3}
                              value={editBody}
                              onChange={(event) => setEditBody(event.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn-primary px-3 py-1.5 text-xs"
                                disabled={busy}
                                onClick={() => void saveEdit(message.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn-secondary px-3 py-1.5 text-xs"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditBody("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {message.body ? (
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                                {message.body}
                              </p>
                            ) : null}
                            {(message.attachments || []).map((attachment) => (
                              <button
                                key={attachment.url}
                                type="button"
                                className="mt-2 block overflow-hidden rounded-xl"
                                onClick={() => setLightbox(resolveAssetUrl(attachment.url))}
                              >
                                <ChatImage
                                  src={resolveAssetUrl(attachment.url)}
                                  alt={attachment.name}
                                  className="max-h-56 max-w-full object-cover"
                                />
                              </button>
                            ))}
                          </>
                        )}
                        <div
                          className={`mt-2 flex flex-wrap items-center gap-2 text-[10px] ${
                            mine ? "text-ink-300" : "text-ink-400"
                          }`}
                        >
                          <span>
                            {formatWhen(message.created_at)}
                            {message.edited_at ? " · edited" : ""}
                          </span>
                          {mine ? (
                            <>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:underline"
                                onClick={() => {
                                  setEditingId(message.id);
                                  setEditBody(message.body);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:underline"
                                onClick={() => void removeMessage(message, "all")}
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 hover:underline"
                              onClick={() => void removeMessage(message, "me")}
                            >
                              <Trash2 className="h-3 w-3" />
                              Hide for me
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>
              <AttachmentStrip
                attachments={pendingAttachments}
                onRemove={(index) =>
                  setPendingAttachments((prev) => {
                    const target = prev[index];
                    if (target?.preview_url?.startsWith("blob:")) {
                      URL.revokeObjectURL(target.preview_url);
                    }
                    return prev.filter((_, i) => i !== index);
                  })
                }
              />
              <form onSubmit={sendReply} className="border-t border-ink-100 bg-white p-4">
                <div className="flex items-end gap-2">
                  <EmojiMenu
                    open={emojiOpen}
                    onToggle={() => setEmojiOpen((v) => !v)}
                    onPick={(emoji) => insertEmoji(emoji, "reply")}
                  />
                  <button
                    type="button"
                    className="btn-secondary h-12 px-3"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy || pendingAttachments.length >= 4}
                    aria-label="Attach image"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <textarea
                    className="input-field min-h-[48px] flex-1 resize-y"
                    rows={2}
                    maxLength={20000}
                    placeholder="Write a message… (emoji & images welcome)"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if ((replyBody.trim() || pendingAttachments.length) && !busy) {
                          event.currentTarget.form?.requestSubmit();
                        }
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="btn-primary h-12 px-4"
                    disabled={busy || (!replyBody.trim() && !pendingAttachments.length)}
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
              <MessageCircle className="h-10 w-10 text-brand-500" />
              <p className="mt-4 font-semibold text-ink-800">Member-to-member messaging</p>
              <p className="mt-1 max-w-sm text-sm text-ink-500">
                Pick a conversation or start a new chat with anyone on UXGuard Studio.
              </p>
            </div>
          )}
        </main>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void onPickImage(event.target.files)}
      />

      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Attachment preview" className="max-h-full max-w-full rounded-xl" />
        </button>
      ) : null}

      <CallOverlay
        phase={callPhase}
        call={activeCall}
        selfId={user?.id}
        muted={muted}
        cameraOff={cameraOff}
        elapsedSec={elapsedSec}
        busy={busyAction}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        onAccept={() => void acceptIncoming()}
        onReject={() => void rejectIncoming()}
        onHangup={() => void hangup()}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
      />
    </div>
  );
}

function ChatImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    setCurrent(src);
    setAttempts(0);
  }, [src]);

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        if (attempts >= 4) return;
        const next = attempts + 1;
        setAttempts(next);
        const base = src.split("?")[0];
        window.setTimeout(() => {
          setCurrent(`${base}?v=${Date.now()}&r=${next}`);
        }, 200 * next);
      }}
    />
  );
}

function AttachmentStrip({
  attachments,
  onRemove,
}: {
  attachments: InternalMessageAttachment[];
  onRemove: (index: number) => void;
}) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap gap-2 border-t border-ink-100 bg-white px-4 py-3">
      {attachments.map((attachment, index) => (
        <div key={`${attachment.url}-${index}`} className="relative">
          <ChatImage
            src={attachment.preview_url || resolveAssetUrl(attachment.url)}
            alt={attachment.name}
            className="h-16 w-16 rounded-lg object-cover"
          />
          <button
            type="button"
            className="absolute -right-1 -top-1 rounded-full bg-ink-950 px-1.5 text-[10px] text-white"
            onClick={() => onRemove(index)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function EmojiMenu({
  open,
  onToggle,
  onPick,
}: {
  open: boolean;
  onToggle: () => void;
  onPick: (emoji: string) => void;
}) {
  return (
    <div className="relative">
      <button type="button" className="btn-secondary h-12 px-3" onClick={onToggle} aria-label="Emoji">
        <Smile className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute bottom-14 left-0 z-20 grid w-56 grid-cols-6 gap-1 rounded-xl border border-ink-200 bg-white p-2 shadow-lg">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded-md p-1 text-lg hover:bg-ink-50"
              onClick={() => {
                onPick(emoji);
                onToggle();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
