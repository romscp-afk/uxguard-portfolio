import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AssistantPageContext, AssistantStatus, AssistantThreadMessage } from "../types";
import { api } from "../api/client";

interface AssistantContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pageContext: AssistantPageContext;
  setPageContext: (ctx: Partial<AssistantPageContext>) => void;
  messages: AssistantThreadMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantThreadMessage[]>>;
  status: AssistantStatus | null;
  statusLoading: boolean;
  refreshStatus: () => Promise<void>;
  clearThread: () => void;
  pendingFieldUpdates: Record<string, unknown> | null;
  setPendingFieldUpdates: (updates: Record<string, unknown> | null) => void;
}

const DEFAULT_PAGE_CONTEXT: AssistantPageContext = {
  type: "general",
  pageLabel: "Dashboard",
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pageContext, setPageContextState] = useState<AssistantPageContext>(DEFAULT_PAGE_CONTEXT);
  const [messages, setMessages] = useState<AssistantThreadMessage[]>([]);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [pendingFieldUpdates, setPendingFieldUpdates] = useState<Record<string, unknown> | null>(
    null,
  );

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const next = await api.getAssistantStatus();
      setStatus(next);
    } catch {
      setStatus({ enabled: false, provider: null, model: null });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const setPageContext = useCallback((ctx: Partial<AssistantPageContext>) => {
    setPageContextState((prev) => ({ ...prev, ...ctx }));
  }, []);

  const clearThread = useCallback(() => {
    setMessages([]);
    setPendingFieldUpdates(null);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      pageContext,
      setPageContext,
      messages,
      setMessages,
      status,
      statusLoading,
      refreshStatus,
      clearThread,
      pendingFieldUpdates,
      setPendingFieldUpdates,
    }),
    [
      open,
      pageContext,
      messages,
      status,
      statusLoading,
      refreshStatus,
      clearThread,
      pendingFieldUpdates,
      setPageContext,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return ctx;
}

export function useAssistantPage(context: Omit<AssistantPageContext, "draft"> | null) {
  const { setPageContext } = useAssistant();

  useEffect(() => {
    if (!context) {
      setPageContext(DEFAULT_PAGE_CONTEXT);
      return;
    }
    setPageContext(context);
    return () => {
      setPageContext(DEFAULT_PAGE_CONTEXT);
    };
  }, [
    context?.type,
    context?.pageLabel,
    context?.entityId,
    context?.field,
    context?.onApply,
    setPageContext,
  ]);
}

export function useAssistantDraft(draft: Record<string, unknown> | undefined) {
  const { setPageContext } = useAssistant();

  useEffect(() => {
    setPageContext({ draft });
  }, [draft, setPageContext]);
}

export function createThreadMessage(
  role: "user" | "assistant",
  content: string,
  extras?: Partial<AssistantThreadMessage>,
): AssistantThreadMessage {
  return {
    id: uid(),
    role,
    content,
    ...extras,
  };
}
