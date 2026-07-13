import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../../../api/client";
import { LimitReachedDialog } from "../../../components/billing/LimitReachedDialog";
import { AiGenerationProgress } from "../../../components/ai/AiGenerationProgress";
import { AiOutputWorkspace } from "../../../components/ai/AiOutputWorkspace";
import { EditGuard, ReadOnlyNotice } from "../../../components/platform/ReadOnlyNotice";
import { trackBillingEvent } from "../../../lib/analytics";
import {
  contentToMarkdown,
  getAssistant,
} from "../../../lib/aiAssistants";
import { canEditPlatform } from "../../../lib/roles";
import { useAuth } from "../../../context/AuthContext";

type Version = {
  id: string;
  markdown: string;
  content: Record<string, unknown>;
  createdAt: string;
};

export function AiWorkspacePage() {
  const { assistantType } = useParams<{ assistantType: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const readOnly = !canEditPlatform(user);
  const assistant = getAssistant(assistantType);

  const [action, setAction] = useState(assistant?.defaultAction || "");
  const [form, setForm] = useState<Record<string, string>>({});
  const [conversationId, setConversationId] = useState<string | null>(
    searchParams.get("conversation"),
  );
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeVersion, setActiveVersion] = useState(0);
  const [markdown, setMarkdown] = useState("");
  const [rawContent, setRawContent] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limitDialog, setLimitDialog] = useState<{
    title: string;
    message: string;
    resetDate?: string | null;
  } | null>(null);

  useEffect(() => {
    if (assistant) {
      setAction(assistant.defaultAction);
      setForm({});
    }
  }, [assistant?.id]);

  useEffect(() => {
    api.getAiCredits().then((c) => setRemaining(c.remaining_credits)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const id = searchParams.get("conversation");
    if (!id) return;
    setConversationId(id);
    api
      .getAiConversation(id)
      .then(({ messages }) => {
        const assistantMsgs = messages.filter((m) => m.role === "assistant");
        const nextVersions: Version[] = assistantMsgs.map((m) => {
          const content =
            typeof m.content === "object" && m.content
              ? (m.content as Record<string, unknown>)
              : { markdown: String(m.content || "") };
          return {
            id: m.id,
            content,
            markdown: contentToMarkdown(content),
            createdAt: m.created_at,
          };
        });
        setVersions(nextVersions);
        if (nextVersions.length) {
          const last = nextVersions.length - 1;
          setActiveVersion(last);
          setMarkdown(nextVersions[last].markdown);
          setRawContent(nextVersions[last].content);
        }
      })
      .catch(() => setError("Could not load that conversation."));
  }, [searchParams]);

  const selectedAction = useMemo(
    () => assistant?.actions.find((a) => a.id === action),
    [assistant, action],
  );

  if (!assistant) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-500">Unknown assistant.</p>
        <Link to="/admin/ai" className="btn-primary mt-4 inline-flex">
          Back to UXGuard AI
        </Link>
      </div>
    );
  }

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function runGenerate(opts?: {
    actionOverride?: string;
    priorContent?: Record<string, unknown> | string | null;
    versionOf?: string | null;
    keepForm?: boolean;
  }) {
    if (!assistant || readOnly || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const tone = form.tone || "professional";
      const length = form.length || form.feedback_depth || "detailed";
      const inputs: Record<string, unknown> = { ...form };
      delete inputs.tone;
      delete inputs.length;

      const result = await api.aiGenerate({
        assistantType: assistant.id,
        action: opts?.actionOverride || action,
        conversationId,
        inputs,
        tone,
        length,
        priorContent: opts?.priorContent ?? null,
        versionOf: opts?.versionOf || null,
      });

      setConversationId(result.conversationId);
      setRemaining(result.remainingCredits);
      const md = contentToMarkdown(result.content);
      const version: Version = {
        id: result.messageId,
        markdown: md,
        content: result.content,
        createdAt: new Date().toISOString(),
      };
      setVersions((prev) => {
        const next = [...prev, version];
        setActiveVersion(next.length - 1);
        return next;
      });
      setMarkdown(md);
      setRawContent(result.content);
      setMessage(`Generated · ${result.creditsUsed} credit${result.creditsUsed === 1 ? "" : "s"} used.`);
      navigate(`/admin/ai/${assistant.id}?conversation=${result.conversationId}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.remainingCredits !== undefined) setRemaining(err.remainingCredits);
        if (err.status === 402 || err.code === "insufficient_credits") {
          trackBillingEvent("usage_limit_reached", { resource: "ai_credits" });
          trackBillingEvent("upgrade_prompt_viewed", { resource: "ai_credits" });
          setLimitDialog({
            title: "AI credits used up",
            message: err.message,
          });
        }
      } else {
        setError("Generation failed. Check your connection and try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    runGenerate();
  }

  function selectVersion(index: number) {
    const version = versions[index];
    if (!version) return;
    setActiveVersion(index);
    setMarkdown(version.markdown);
    setRawContent(version.content);
  }

  async function handleSave() {
    if (!assistant) return;
    try {
      await api.saveAiOutput({
        conversation_id: conversationId,
        title: form.project_title || form.product_name || assistant.name,
        output_type: assistant.id,
        content: rawContent || { markdown },
      });
      setMessage("Output saved to your library.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save output.");
    }
  }

  function startNew() {
    if (!assistant) return;
    setConversationId(null);
    setVersions([]);
    setActiveVersion(0);
    setMarkdown("");
    setRawContent(null);
    setMessage("");
    setError("");
    navigate(`/admin/ai/${assistant.id}`, { replace: true });
  }

  return (
    <div>
      <LimitReachedDialog
        open={Boolean(limitDialog)}
        title={limitDialog?.title || ""}
        message={limitDialog?.message || ""}
        resetDate={limitDialog?.resetDate}
        onClose={() => setLimitDialog(null)}
      />
      <ReadOnlyNotice />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/ai" className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          UXGuard AI
        </Link>
        {remaining !== null ? (
          <p className="text-sm text-ink-500">
            Credits remaining: <span className="font-semibold text-ink-800">{remaining}</span>
          </p>
        ) : null}
      </div>

      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink-950">{assistant.name}</h1>
        <p className="mt-1 max-w-2xl text-ink-500">{assistant.description}</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <form onSubmit={handleSubmit} className="card space-y-5 p-6">
            <fieldset>
              <legend className="text-sm font-semibold text-ink-900">Choose a task</legend>
              <div className="mt-3 space-y-2">
                {assistant.actions.map((item) => (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                      action === item.id ? "border-brand-400 bg-brand-50" : "border-ink-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="action"
                      value={item.id}
                      checked={action === item.id}
                      onChange={() => setAction(item.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink-900">{item.label}</span>
                      <span className="block text-xs text-ink-500">
                        {item.description} · {item.credits} credit{item.credits === 1 ? "" : "s"}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-ink-900">Guided inputs</legend>
              {assistant.fields.map((field) => (
                <div key={field.key}>
                  <label className="label-field" htmlFor={`ai-${field.key}`}>
                    {field.label}
                    {field.optional ? (
                      <span className="ml-1 font-normal text-ink-400">(optional)</span>
                    ) : null}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={`ai-${field.key}`}
                      className="input-field"
                      rows={field.rows || 3}
                      placeholder={field.placeholder}
                      value={form[field.key] || ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={`ai-${field.key}`}
                      className="input-field"
                      value={form[field.key] || field.options?.[0]?.value || ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`ai-${field.key}`}
                      type={field.type === "number" ? "number" : "text"}
                      className="input-field"
                      placeholder={field.placeholder}
                      value={form[field.key] || ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </fieldset>

            <EditGuard>
              <button type="submit" className="btn-primary w-full" disabled={busy || readOnly}>
                {busy
                  ? "Generating…"
                  : `Generate · ${selectedAction?.credits ?? "?"} credit${selectedAction?.credits === 1 ? "" : "s"}`}
              </button>
            </EditGuard>
          </form>
        </div>

        <div className="space-y-4 xl:col-span-7">
          <AiGenerationProgress active={busy} />

          {versions.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {versions.map((version, index) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => selectVersion(index)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    activeVersion === index
                      ? "bg-brand-600 text-white"
                      : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  }`}
                >
                  Version {index + 1}
                </button>
              ))}
            </div>
          ) : null}

          {markdown || busy ? (
            <AiOutputWorkspace
              markdown={markdown}
              onChange={setMarkdown}
              busy={busy}
              onRegenerate={() =>
                runGenerate({
                  actionOverride: "regenerate",
                  priorContent: rawContent || markdown,
                  versionOf: versions[activeVersion]?.id,
                })
              }
              onShorten={() =>
                runGenerate({
                  actionOverride: "shorten",
                  priorContent: markdown,
                  versionOf: versions[activeVersion]?.id,
                })
              }
              onExpand={() =>
                runGenerate({
                  actionOverride: "expand",
                  priorContent: markdown,
                  versionOf: versions[activeVersion]?.id,
                })
              }
              onMakeProfessional={() =>
                runGenerate({
                  actionOverride: "make-professional",
                  priorContent: markdown,
                  versionOf: versions[activeVersion]?.id,
                })
              }
              onSave={handleSave}
              onNew={startNew}
            />
          ) : (
            <div className="card border-dashed p-10 text-center text-sm text-ink-500">
              Fill in the guided form and generate. Your editable workspace will appear here. Regenerations
              create new versions instead of overwriting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
