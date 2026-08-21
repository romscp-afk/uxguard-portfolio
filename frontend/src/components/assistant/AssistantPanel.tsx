import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { api, ApiError } from "../../api/client";
import { createThreadMessage, useAssistant } from "../../context/AssistantContext";
import { useAuth } from "../../context/AuthContext";
import { QUICK_PROMPTS, contextLabel } from "../../lib/assistantPrompts";
import { canEditPlatform } from "../../lib/roles";

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-ink-100 px-1 py-0.5 text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part === "\n") return <br key={i} />;
    return <span key={i}>{part}</span>;
  });
}

export function AssistantFab() {
  const { open, toggle } = useAssistant();

  return (
    <button
      type="button"
      onClick={toggle}
      className={`fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition ${
        open
          ? "bg-ink-800 text-white hover:bg-ink-700"
          : "bg-brand-600 text-white hover:bg-brand-500"
      }`}
      aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      title="UXGuard AI"
    >
      {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
    </button>
  );
}

export function AssistantPanel() {
  const { user } = useAuth();
  const canEdit = canEditPlatform(user);
  const {
    open,
    setOpen,
    pageContext,
    messages,
    setMessages,
    status,
    statusLoading,
    clearThread,
    pendingFieldUpdates,
    setPendingFieldUpdates,
  } = useAssistant();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    setApplied(false);
  }, [pendingFieldUpdates]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (!status?.enabled) {
      setError("AI is not configured yet. Add OPENAI_API_KEY to your Vercel environment.");
      return;
    }

    setError("");
    setSending(true);
    const userMessage = createThreadMessage("user", trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");

    const wantsUpdates =
      /draft|write|improve|generate|rewrite|polish|create|fill|suggest.*for/i.test(trimmed);

    try {
      const response = await api.assistantChat({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        context: pageContext.type,
        field: pageContext.field,
        draft: pageContext.draft,
        field_updates_requested: wantsUpdates && canEdit,
      });

      const assistantMessage = createThreadMessage("assistant", response.message, {
        field_updates: response.field_updates,
        suggestions: response.suggestions,
      });
      setMessages((prev) => [...prev, assistantMessage]);

      if (response.field_updates && Object.keys(response.field_updates).length > 0) {
        setPendingFieldUpdates(response.field_updates);
      }
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : "Could not reach AI assistant.";
      setError(detail);
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleApply() {
    if (!pendingFieldUpdates || !pageContext.onApply || !canEdit) return;
    pageContext.onApply(pendingFieldUpdates);
    setPendingFieldUpdates(null);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  const quickPrompts = QUICK_PROMPTS[pageContext.type] || QUICK_PROMPTS.general;

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-ink-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">UXGuard AI</p>
            <p className="text-xs text-ink-500">
              {contextLabel(pageContext.type)} · {pageContext.pageLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearThread}
            className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
            title="New conversation"
            aria-label="New conversation"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {statusLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking AI status…
        </div>
      ) : !status?.enabled ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <Sparkles className="h-10 w-10 text-brand-300" />
          <p className="text-sm font-medium text-ink-800">AI assistant ready to connect</p>
          <p className="text-xs leading-relaxed text-ink-500">
            Add <code className="rounded bg-ink-100 px-1">OPENAI_API_KEY</code> to your Vercel
            project environment, then redeploy. Optional: set{" "}
            <code className="rounded bg-ink-100 px-1">AI_MODEL</code> (default gpt-4o-mini).
          </p>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                  <p className="text-sm text-ink-700">
                    Hi{user?.name ? ` ${user.name.split(" ")[0]}` : ""}! I can help you draft case
                    studies, polish your bio, describe projects, and structure your portfolio — like
                    ChatGPT, but tuned for UX research storytelling.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Try asking
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        disabled={sending}
                        className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-left text-xs text-ink-700 transition hover:border-brand-300 hover:bg-brand-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-brand-600 text-white"
                        : "border border-ink-100 bg-ink-50 text-ink-800"
                    }`}
                  >
                    {msg.role === "assistant" ? renderMarkdownLite(msg.content) : msg.content}
                    {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink-200/80 pt-2">
                        {msg.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => sendMessage(suggestion)}
                            disabled={sending}
                            className="rounded-full bg-white px-2.5 py-1 text-[11px] text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {sending ? (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2 text-sm text-ink-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              </div>
            ) : null}
          </div>

          {pendingFieldUpdates && pageContext.onApply && canEdit ? (
            <div className="border-t border-brand-100 bg-brand-50/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-brand-800">Suggested edits ready</p>
                  <p className="truncate text-xs text-brand-700/80">
                    {Object.keys(pendingFieldUpdates).join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApply}
                  className="btn-primary shrink-0 py-2 text-xs"
                >
                  {applied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Applied
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5" />
                      Apply to form
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="border-t border-ink-100 p-4">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                rows={2}
                placeholder="Ask me to draft, improve, or plan your portfolio…"
                className="input-field min-h-[44px] flex-1 resize-none py-2 text-sm"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="btn-primary self-end px-3 py-2"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-ink-400">
              Enter to send · Shift+Enter for new line
              {status?.model ? ` · ${status.model}` : ""}
            </p>
          </form>
        </>
      )}
    </div>
  );
}
