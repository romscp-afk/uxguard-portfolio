import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Bot,
  FileText,
  FlaskConical,
  History,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { api, ApiError } from "../../../api/client";
import { ReadOnlyNotice } from "../../../components/platform/ReadOnlyNotice";
import { AI_ASSISTANTS } from "../../../lib/aiAssistants";
import type { AiConversation, AiCreditsSummary, SavedAiOutput } from "../../../types";

const ICONS = {
  "case-study": FileText,
  research: FlaskConical,
  documentation: ClipboardList,
  "portfolio-review": Sparkles,
};

export function AiHubPage() {
  const [credits, setCredits] = useState<AiCreditsSummary | null>(null);
  const [recent, setRecent] = useState<AiConversation[]>([]);
  const [saved, setSaved] = useState<SavedAiOutput[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getAiCredits(),
      api.listAiConversations({ recent: true, limit: 5 }),
      api.listSavedAiOutputs(),
    ])
      .then(([creditSummary, conversations, outputs]) => {
        if (cancelled) return;
        setCredits(creditSummary);
        setRecent(conversations.conversations || []);
        setSaved((outputs.outputs || []).slice(0, 5));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load UXGuard AI.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">UXGuard AI</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-950">AI Assistant</h1>
          <p className="mt-2 max-w-2xl text-ink-500">
            Four UX-focused tools for case studies, research materials, product documentation and
            portfolio reviews — guided forms, credit-aware generation, and editable workspaces.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/ai/history" className="btn-secondary">
            <History className="h-4 w-4" />
            History
          </Link>
          <Link to="/admin/ai/saved" className="btn-secondary">
            <Bookmark className="h-4 w-4" />
            Saved outputs
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card mb-8 flex flex-col gap-4 border-brand-100 bg-gradient-to-r from-brand-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Remaining AI credits</p>
            <p className="mt-1 text-sm text-ink-600">
              {credits
                ? `${credits.remaining_credits} of ${credits.monthly_allowance + credits.purchased_credits} remaining · resets ${credits.reset_date}`
                : "Loading credit balance…"}
            </p>
            {!credits?.enabled ? (
              <p className="mt-2 text-xs text-amber-700">
                Server needs <code className="rounded bg-amber-50 px-1">OPENAI_API_KEY</code> (and
                optional <code className="rounded bg-amber-50 px-1">OPENAI_MODEL</code>) to generate.
              </p>
            ) : null}
          </div>
        </div>
        <p className="font-display text-4xl font-bold text-ink-950">
          {credits ? credits.remaining_credits : "—"}
        </p>
      </div>

      <h2 className="font-semibold text-ink-900">Assistants</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {AI_ASSISTANTS.map((assistant) => {
          const Icon = ICONS[assistant.id];
          return (
            <Link
              key={assistant.id}
              to={`/admin/ai/${assistant.id}`}
              className="card group overflow-hidden transition hover:border-brand-300 hover:shadow-md"
            >
              <div className={`bg-gradient-to-br ${assistant.accent} px-5 py-6 text-white`}>
                <Icon className="h-6 w-6 opacity-90" />
                <h3 className="mt-4 font-display text-xl font-bold">{assistant.name}</h3>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-ink-600">{assistant.description}</p>
                <ul className="mt-4 space-y-1.5">
                  {assistant.actions.slice(0, 4).map((action) => (
                    <li key={action.id} className="text-xs text-ink-500">
                      · {action.label}{" "}
                      <span className="text-ink-400">({action.credits} cr)</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:text-brand-600">
                  Open assistant
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink-900">Recent conversations</h2>
            <Link to="/admin/ai/history" className="text-xs font-medium text-brand-600">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No conversations yet. Start with an assistant above.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/admin/ai/${item.assistant_type}?conversation=${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5 text-sm hover:bg-ink-50"
                  >
                    <span className="truncate font-medium text-ink-800">{item.title}</span>
                    <span className="shrink-0 text-xs capitalize text-ink-400">
                      {String(item.assistant_type).replace("-", " ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink-900">Saved AI outputs</h2>
            <Link to="/admin/ai/saved" className="text-xs font-medium text-brand-600">
              View all
            </Link>
          </div>
          {saved.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No saved outputs yet. Save from a workspace after generating.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {saved.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-ink-100 px-3 py-2.5 text-sm"
                >
                  <p className="font-medium text-ink-800">{item.title}</p>
                  <p className="text-xs text-ink-400">{item.output_type}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
