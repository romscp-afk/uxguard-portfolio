import { randomUUID } from "node:crypto";
import { updateStore, readStore } from "../store.js";
import { DEFAULT_MONTHLY_ALLOWANCE } from "./config.js";

function nowIso() {
  return new Date().toISOString();
}

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function ensureAiCollections(store) {
  store.ai_conversations = store.ai_conversations || [];
  store.ai_messages = store.ai_messages || [];
  store.ai_usage = store.ai_usage || [];
  store.user_ai_credits = store.user_ai_credits || [];
  store.saved_ai_outputs = store.saved_ai_outputs || [];
  return store;
}

function defaultCredits(userId) {
  return {
    user_id: Number(userId),
    monthly_allowance: DEFAULT_MONTHLY_ALLOWANCE,
    purchased_credits: 0,
    used_credits: 0,
    reset_date: monthKey(),
  };
}

export async function getOrCreateCredits(userId) {
  let credits = null;
  await updateStore((store) => {
    ensureAiCollections(store);
    const id = Number(userId);
    let row = store.user_ai_credits.find((c) => Number(c.user_id) === id);
    let touched = false;
    if (!row) {
      row = defaultCredits(id);
      store.user_ai_credits.push(row);
      touched = true;
    }
    const currentMonth = monthKey();
    if (row.reset_date !== currentMonth) {
      row.used_credits = 0;
      row.reset_date = currentMonth;
      row.monthly_allowance = row.monthly_allowance || DEFAULT_MONTHLY_ALLOWANCE;
      touched = true;
    }
    credits = { ...row };
    if (!touched) store.__uxguardSkipWrite = true;
    return store;
  });
  return credits;
}

export function remainingCredits(row) {
  const allowance = Number(row.monthly_allowance || 0) + Number(row.purchased_credits || 0);
  return Math.max(0, allowance - Number(row.used_credits || 0));
}

/**
 * Overwrite monthly_allowance for a user. Used by billing plan sync.
 */
export async function setMonthlyAllowance(userId, allowance) {
  let credits = null;
  await updateStore((store) => {
    ensureAiCollections(store);
    const id = Number(userId);
    let row = store.user_ai_credits.find((c) => Number(c.user_id) === id);
    if (!row) {
      row = defaultCredits(id);
      store.user_ai_credits.push(row);
    }
    row.monthly_allowance = Number(allowance);
    credits = { ...row };
    return store;
  });
  return credits;
}

export async function consumeCredits(userId, amount, meta = {}) {
  let result = null;
  await updateStore((store) => {
    ensureAiCollections(store);
    const id = Number(userId);
    let row = store.user_ai_credits.find((c) => Number(c.user_id) === id);
    if (!row) {
      row = defaultCredits(id);
      store.user_ai_credits.push(row);
    }
    const currentMonth = monthKey();
    if (row.reset_date !== currentMonth) {
      row.used_credits = 0;
      row.reset_date = currentMonth;
    }
    const remaining = remainingCredits(row);
    if (remaining < amount) {
      const error = new Error("You have no AI credits remaining this month.");
      error.status = 402;
      error.code = "insufficient_credits";
      throw error;
    }
    row.used_credits = Number(row.used_credits || 0) + amount;
    store.ai_usage.push({
      id: randomUUID(),
      user_id: id,
      feature: meta.feature || "ai.generate",
      model: meta.model || null,
      input_tokens: meta.input_tokens || 0,
      output_tokens: meta.output_tokens || 0,
      credits_used: amount,
      created_at: nowIso(),
    });
    result = {
      creditsUsed: amount,
      remainingCredits: remainingCredits(row),
      credits: { ...row },
    };
    return store;
  });
  return result;
}

export async function listConversations(userId, { q } = {}) {
  const store = ensureAiCollections(await readStore());
  let list = store.ai_conversations
    .filter((c) => Number(c.user_id) === Number(userId))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    list = list.filter((c) => String(c.title || "").toLowerCase().includes(needle));
  }
  return list;
}

export async function getConversationForUser(conversationId, userId) {
  const store = ensureAiCollections(await readStore());
  const conversation = store.ai_conversations.find(
    (c) => c.id === conversationId && Number(c.user_id) === Number(userId),
  );
  if (!conversation) return null;
  const messages = store.ai_messages
    .filter((m) => m.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return { conversation, messages };
}

export async function createConversation(userId, { title, assistant_type }) {
  const conversation = {
    id: randomUUID(),
    user_id: Number(userId),
    title: title || "New conversation",
    assistant_type,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await updateStore((store) => {
    ensureAiCollections(store);
    store.ai_conversations.push(conversation);
    return store;
  });
  return conversation;
}

export async function updateConversation(conversationId, userId, patch) {
  let updated = null;
  await updateStore((store) => {
    ensureAiCollections(store);
    const index = store.ai_conversations.findIndex(
      (c) => c.id === conversationId && Number(c.user_id) === Number(userId),
    );
    if (index === -1) {
      const error = new Error("Conversation not found");
      error.status = 404;
      throw error;
    }
    store.ai_conversations[index] = {
      ...store.ai_conversations[index],
      ...patch,
      updated_at: nowIso(),
    };
    updated = { ...store.ai_conversations[index] };
    return store;
  });
  return updated;
}

export async function deleteConversation(conversationId, userId) {
  await updateStore((store) => {
    ensureAiCollections(store);
    const index = store.ai_conversations.findIndex(
      (c) => c.id === conversationId && Number(c.user_id) === Number(userId),
    );
    if (index === -1) {
      const error = new Error("Conversation not found");
      error.status = 404;
      throw error;
    }
    store.ai_conversations.splice(index, 1);
    store.ai_messages = store.ai_messages.filter((m) => m.conversation_id !== conversationId);
    store.saved_ai_outputs = store.saved_ai_outputs.filter(
      (o) => o.conversation_id !== conversationId || Number(o.user_id) !== Number(userId),
    );
    return store;
  });
}

export async function appendMessage({
  conversationId,
  role,
  content,
  input_tokens = 0,
  output_tokens = 0,
  credits_used = 0,
  version_of = null,
}) {
  const message = {
    id: randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    input_tokens,
    output_tokens,
    credits_used,
    version_of,
    created_at: nowIso(),
  };
  await updateStore((store) => {
    ensureAiCollections(store);
    store.ai_messages.push(message);
    const conv = store.ai_conversations.find((c) => c.id === conversationId);
    if (conv) conv.updated_at = nowIso();
    return store;
  });
  return message;
}

export async function listSavedOutputs(userId) {
  const store = ensureAiCollections(await readStore());
  return store.saved_ai_outputs
    .filter((o) => Number(o.user_id) === Number(userId))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function saveOutput(userId, { conversation_id, title, output_type, content }) {
  const output = {
    id: randomUUID(),
    user_id: Number(userId),
    conversation_id: conversation_id || null,
    title: title || "Saved output",
    output_type: output_type || "general",
    content,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await updateStore((store) => {
    ensureAiCollections(store);
    store.saved_ai_outputs.push(output);
    return store;
  });
  return output;
}

export async function deleteSavedOutput(outputId, userId) {
  await updateStore((store) => {
    ensureAiCollections(store);
    const index = store.saved_ai_outputs.findIndex(
      (o) => o.id === outputId && Number(o.user_id) === Number(userId),
    );
    if (index === -1) {
      const error = new Error("Saved output not found");
      error.status = 404;
      throw error;
    }
    store.saved_ai_outputs.splice(index, 1);
    return store;
  });
}

export async function getRecentConversations(userId, limit = 5) {
  const list = await listConversations(userId);
  return list.slice(0, limit);
}
