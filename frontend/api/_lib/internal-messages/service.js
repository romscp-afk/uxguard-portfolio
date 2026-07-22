import { randomUUID } from "node:crypto";
import { readStore, updateStore } from "../store.js";
import { createNotification } from "../community.js";
import { sendInternalMessageNotificationEmail } from "../mail.js";
import { decryptInternalText, encryptInternalText } from "./crypto.js";

const MAX_ATTACHMENT_BYTES = 500 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function httpError(message, status = 400, code = "INTERNAL_MESSAGE_ERROR") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function ensureCollections(store) {
  store.internal_message_threads = store.internal_message_threads || [];
  store.internal_messages = store.internal_messages || [];
  return store;
}

function cleanText(value, max) {
  return String(value || "").trim().slice(0, max);
}

function sameId(a, b) {
  return Number(a) === Number(b);
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: Number(user.id),
    name: user.name || user.email || "User",
    email: user.email || "",
    role: user.role || "professional",
    avatar_url: user.avatar_url || null,
  };
}

function normalizeParticipants(thread) {
  if (Array.isArray(thread.participant_ids) && thread.participant_ids.length) {
    return [...new Set(thread.participant_ids.map(Number).filter(Number.isFinite))];
  }
  // Legacy admin↔user threads
  const ids = [];
  if (thread.user_id != null) ids.push(Number(thread.user_id));
  if (thread.created_by != null) ids.push(Number(thread.created_by));
  return [...new Set(ids.filter(Number.isFinite))];
}

function isParticipant(thread, userId) {
  return normalizeParticipants(thread).includes(Number(userId));
}

function unreadMap(thread) {
  if (thread.unread && typeof thread.unread === "object") {
    const out = {};
    for (const [key, value] of Object.entries(thread.unread)) {
      out[String(key)] = Number(value) || 0;
    }
    return out;
  }
  // Legacy unread fields
  const out = {};
  if (thread.user_id != null) out[String(thread.user_id)] = Number(thread.unread_user) || 0;
  if (thread.created_by != null && !sameId(thread.created_by, thread.user_id)) {
    out[String(thread.created_by)] = Number(thread.unread_admin) || 0;
  }
  return out;
}

function deletedForSet(value) {
  if (Array.isArray(value)) return new Set(value.map(Number).filter(Number.isFinite));
  return new Set();
}

function assertThreadAccess(thread, user) {
  if (!thread) throw httpError("Conversation not found.", 404, "THREAD_NOT_FOUND");
  if (!isParticipant(thread, user.id)) {
    throw httpError("You cannot access this conversation.", 403, "THREAD_FORBIDDEN");
  }
  const deletedFor = deletedForSet(thread.deleted_for);
  if (deletedFor.has(Number(user.id))) {
    throw httpError("Conversation not found.", 404, "THREAD_NOT_FOUND");
  }
}

function otherParticipants(thread, userId) {
  return normalizeParticipants(thread).filter((id) => !sameId(id, userId));
}

function normalizeAttachment(raw) {
  if (!raw || typeof raw !== "object") return null;
  const url = cleanText(raw.url, 2000);
  const mime = cleanText(raw.mime_type || raw.mimeType || "image/jpeg", 100).toLowerCase();
  if (!url || !ALLOWED_ATTACHMENT_TYPES.has(mime)) return null;
  const size = Number(raw.size_bytes || raw.sizeBytes || 0);
  if (size > MAX_ATTACHMENT_BYTES) {
    throw httpError("Images must be 500 KB or smaller after compression.", 400, "ATTACHMENT_TOO_LARGE");
  }
  const pathname = cleanText(raw.pathname, 500) || null;
  const isChatPath =
    pathname && pathname.startsWith("uxguard/chat/") && !pathname.includes("..");
  const isChatUrl = url.includes("/internal-messages/file/");
  const isMediaUrl = url.includes("/api/v1/media/file/") || url.startsWith("/api/v1/media/file/");
  if (!isChatUrl && !isMediaUrl && !isChatPath) {
    // Reject arbitrary remote URLs — chat images must come from our upload endpoints.
    return null;
  }
  return {
    url,
    pathname: isChatPath ? pathname : null,
    mime_type: mime,
    size_bytes: size || 0,
    name: cleanText(raw.name || "image", 200) || "image",
    width: Number(raw.width) || null,
    height: Number(raw.height) || null,
  };
}

function decryptThread(thread, users, viewerId) {
  const participants = normalizeParticipants(thread)
    .map((id) => publicUser(users.find((u) => sameId(u.id, id))))
    .filter(Boolean);
  const counterpart =
    participants.find((p) => !sameId(p.id, viewerId)) ||
    participants[0] ||
    null;
  const unread = unreadMap(thread);
  return {
    id: thread.id,
    participant_ids: normalizeParticipants(thread),
    participants,
    counterpart,
    user_id: Number(thread.user_id) || Number(counterpart?.id) || null,
    user: counterpart,
    subject: decryptInternalText(thread.subject_enc, `thread:${thread.id}:subject`),
    created_by: Number(thread.created_by),
    last_message_at: thread.last_message_at,
    unread_count: Number(unread[String(viewerId)]) || 0,
    // Back-compat fields used by older clients
    unread_user: Number(thread.unread_user) || 0,
    unread_admin: Number(thread.unread_admin) || 0,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
  };
}

function decryptMessage(message, users, viewerId) {
  const deletedFor = deletedForSet(message.deleted_for);
  if (deletedFor.has(Number(viewerId))) return null;
  if (message.deleted_for_all) {
    return {
      id: message.id,
      thread_id: message.thread_id,
      sender_user_id: Number(message.sender_user_id),
      sender: publicUser(users.find((u) => sameId(u.id, message.sender_user_id))),
      sender_role: message.sender_role || "user",
      body: "",
      attachments: [],
      deleted: true,
      edited_at: message.edited_at || null,
      created_at: message.created_at,
      updated_at: message.updated_at || message.created_at,
    };
  }
  const attachments = Array.isArray(message.attachments)
    ? message.attachments.map(normalizeAttachment).filter(Boolean)
    : [];
  return {
    id: message.id,
    thread_id: message.thread_id,
    sender_user_id: Number(message.sender_user_id),
    sender: publicUser(users.find((u) => sameId(u.id, message.sender_user_id))),
    sender_role: message.sender_role || "user",
    body: decryptInternalText(message.body_enc, `message:${message.id}:body`),
    attachments,
    deleted: false,
    edited_at: message.edited_at || null,
    created_at: message.created_at,
    updated_at: message.updated_at || message.created_at,
  };
}

function threadDetail(store, thread, viewerId) {
  return {
    thread: decryptThread(thread, store.users || [], viewerId),
    messages: store.internal_messages
      .filter((message) => String(message.thread_id) === String(thread.id))
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((message) => decryptMessage(message, store.users || [], viewerId))
      .filter(Boolean),
  };
}

function findExistingDm(store, a, b) {
  return store.internal_message_threads.find((thread) => {
    if (deletedForSet(thread.deleted_for).has(Number(a)) || deletedForSet(thread.deleted_for).has(Number(b))) {
      // Still reuse the underlying conversation if both were participants.
    }
    const participants = normalizeParticipants(thread);
    return (
      participants.length === 2 &&
      participants.includes(Number(a)) &&
      participants.includes(Number(b))
    );
  });
}

async function notifyRecipients({ threadId, sender, recipients }) {
  const senderName = sender.name || sender.email || "Someone";
  const link = `/admin/messages?thread=${encodeURIComponent(threadId)}`;
  for (const recipient of recipients) {
    try {
      await createNotification({
        userId: recipient.id,
        type: "internal_message",
        title: "New private message",
        message: `${senderName} sent you a private portal message.`,
        link,
      });
    } catch {
      // best effort
    }
    if (recipient.email) {
      try {
        await sendInternalMessageNotificationEmail({
          to: recipient.email,
          userName: recipient.name,
          senderName,
          conversationUrl: `${String(
            process.env.PUBLIC_APP_URL || "https://uxguard.studio",
          ).replace(/\/$/, "")}${link}`,
        });
      } catch {
        // best effort
      }
    }
  }
}

function bumpUnread(thread, recipientIds, senderId) {
  const unread = unreadMap(thread);
  for (const id of recipientIds) {
    unread[String(id)] = (Number(unread[String(id)]) || 0) + 1;
  }
  unread[String(senderId)] = 0;
  thread.unread = unread;
}

export async function listInternalThreads(user) {
  const store = ensureCollections(await readStore({ forceRefresh: true }));
  const uid = Number(user.id);
  const threads = store.internal_message_threads
    .filter((thread) => {
      if (!isParticipant(thread, uid)) return false;
      if (deletedForSet(thread.deleted_for).has(uid)) return false;
      return true;
    })
    .sort((a, b) => String(b.last_message_at).localeCompare(String(a.last_message_at)))
    .map((thread) => decryptThread(thread, store.users || [], uid));

  return {
    threads,
    unread_count: threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0),
    users: (store.users || [])
      .filter((candidate) => candidate.email && !sameId(candidate.id, uid))
      .map(publicUser)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function getInternalThread(user, threadId, { markRead = true } = {}) {
  const currentStore = ensureCollections(await readStore({ forceRefresh: true }));
  const currentThread = currentStore.internal_message_threads.find(
    (candidate) => String(candidate.id) === String(threadId),
  );
  assertThreadAccess(currentThread, user);
  const unread = unreadMap(currentThread);
  if (!markRead || !Number(unread[String(user.id)])) {
    return threadDetail(currentStore, currentThread, user.id);
  }

  let result = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const thread = store.internal_message_threads.find(
        (candidate) => String(candidate.id) === String(threadId),
      );
      assertThreadAccess(thread, user);
      const nextUnread = unreadMap(thread);
      nextUnread[String(user.id)] = 0;
      thread.unread = nextUnread;
      thread.updated_at = new Date().toISOString();
      result = threadDetail(store, thread, user.id);
      return store;
    },
    { forceRefresh: true },
  );
  return result;
}

export async function createInternalThread(user, payload = {}) {
  const subject = cleanText(payload.subject, 200) || "Chat";
  const body = cleanText(payload.body || payload.message, 20000);
  const attachments = Array.isArray(payload.attachments)
    ? payload.attachments.map(normalizeAttachment).filter(Boolean).slice(0, 4)
    : [];
  if (!body && !attachments.length) {
    throw httpError("Message text or an image is required.");
  }

  const recipientId = Number(payload.recipient_user_id);
  if (!Number.isFinite(recipientId) || sameId(recipientId, user.id)) {
    throw httpError("Choose another user to message.", 400, "INVALID_RECIPIENT");
  }

  let saved = null;
  let recipients = [];
  await updateStore(
    (store) => {
      ensureCollections(store);
      const recipient = (store.users || []).find((candidate) => sameId(candidate.id, recipientId));
      if (!recipient) {
        throw httpError("Choose a valid user for this conversation.", 400, "INVALID_RECIPIENT");
      }

      const existing = findExistingDm(store, user.id, recipientId);
      const now = new Date().toISOString();
      const messageId = randomUUID();
      const message = {
        id: messageId,
        thread_id: existing?.id || "",
        sender_user_id: Number(user.id),
        sender_role: user.role === "admin" ? "admin" : "user",
        body_enc: encryptInternalText(body || (attachments.length ? "📷 Photo" : ""), `message:${messageId}:body`),
        attachments,
        deleted_for: [],
        deleted_for_all: false,
        edited_at: null,
        created_at: now,
        updated_at: now,
      };

      if (existing) {
        // Restore if previously hidden for either side
        existing.deleted_for = deletedForSet(existing.deleted_for);
        existing.deleted_for.delete(Number(user.id));
        existing.deleted_for.delete(Number(recipientId));
        existing.deleted_for = [...existing.deleted_for];
        message.thread_id = existing.id;
        store.internal_messages.push(message);
        existing.last_message_at = now;
        existing.updated_at = now;
        if (!existing.subject_enc) {
          existing.subject_enc = encryptInternalText(subject, `thread:${existing.id}:subject`);
        }
        bumpUnread(existing, [recipientId], user.id);
        saved = threadDetail(store, existing, user.id);
      } else {
        const threadId = randomUUID();
        message.thread_id = threadId;
        const thread = {
          id: threadId,
          participant_ids: [Number(user.id), Number(recipientId)].sort((a, b) => a - b),
          user_id: Number(recipientId),
          subject_enc: encryptInternalText(subject, `thread:${threadId}:subject`),
          created_by: Number(user.id),
          last_message_at: now,
          unread: {
            [String(user.id)]: 0,
            [String(recipientId)]: 1,
          },
          deleted_for: [],
          created_at: now,
          updated_at: now,
        };
        store.internal_message_threads.push(thread);
        store.internal_messages.push(message);
        saved = threadDetail(store, thread, user.id);
      }
      recipients = [recipient];
      return store;
    },
    { forceRefresh: true },
  );

  await notifyRecipients({ threadId: saved.thread.id, sender: user, recipients });
  return saved;
}

export async function replyInternalThread(user, threadId, payload = {}) {
  const body = cleanText(payload.body || payload.message, 20000);
  const attachments = Array.isArray(payload.attachments)
    ? payload.attachments.map(normalizeAttachment).filter(Boolean).slice(0, 4)
    : [];
  if (!body && !attachments.length) throw httpError("Message text or an image is required.");

  let saved = null;
  let recipients = [];
  await updateStore(
    (store) => {
      ensureCollections(store);
      const thread = store.internal_message_threads.find(
        (candidate) => String(candidate.id) === String(threadId),
      );
      assertThreadAccess(thread, user);
      // Restore for other participants if they had deleted the chat for themselves
      const deletedFor = deletedForSet(thread.deleted_for);
      for (const id of otherParticipants(thread, user.id)) deletedFor.delete(id);
      thread.deleted_for = [...deletedFor];

      const now = new Date().toISOString();
      const messageId = randomUUID();
      const message = {
        id: messageId,
        thread_id: thread.id,
        sender_user_id: Number(user.id),
        sender_role: user.role === "admin" ? "admin" : "user",
        body_enc: encryptInternalText(body || (attachments.length ? "📷 Photo" : ""), `message:${messageId}:body`),
        attachments,
        deleted_for: [],
        deleted_for_all: false,
        edited_at: null,
        created_at: now,
        updated_at: now,
      };
      store.internal_messages.push(message);
      thread.last_message_at = now;
      thread.updated_at = now;
      const recipientIds = otherParticipants(thread, user.id);
      bumpUnread(thread, recipientIds, user.id);
      saved = decryptMessage(message, store.users || [], user.id);
      recipients = (store.users || []).filter((candidate) =>
        recipientIds.some((id) => sameId(id, candidate.id)),
      );
      return store;
    },
    { forceRefresh: true },
  );

  await notifyRecipients({ threadId, sender: user, recipients });
  return saved;
}

export async function editInternalMessage(user, messageId, payload = {}) {
  const body = cleanText(payload.body || payload.message, 20000);
  if (!body) throw httpError("Message text is required.");

  let saved = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.internal_messages.findIndex((m) => String(m.id) === String(messageId));
      if (idx < 0) throw httpError("Message not found.", 404, "MESSAGE_NOT_FOUND");
      const message = store.internal_messages[idx];
      if (!sameId(message.sender_user_id, user.id)) {
        throw httpError("You can only edit your own messages.", 403, "MESSAGE_FORBIDDEN");
      }
      if (message.deleted_for_all) throw httpError("Deleted messages cannot be edited.");
      const thread = store.internal_message_threads.find(
        (candidate) => String(candidate.id) === String(message.thread_id),
      );
      assertThreadAccess(thread, user);
      const now = new Date().toISOString();
      message.body_enc = encryptInternalText(body, `message:${message.id}:body`);
      message.edited_at = now;
      message.updated_at = now;
      store.internal_messages[idx] = message;
      saved = decryptMessage(message, store.users || [], user.id);
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}

export async function deleteInternalMessage(user, messageId, { scope = "me" } = {}) {
  let result = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const idx = store.internal_messages.findIndex((m) => String(m.id) === String(messageId));
      if (idx < 0) throw httpError("Message not found.", 404, "MESSAGE_NOT_FOUND");
      const message = store.internal_messages[idx];
      const thread = store.internal_message_threads.find(
        (candidate) => String(candidate.id) === String(message.thread_id),
      );
      assertThreadAccess(thread, user);

      if (scope === "all") {
        if (!sameId(message.sender_user_id, user.id)) {
          throw httpError("You can only delete your own messages for everyone.", 403);
        }
        message.deleted_for_all = true;
        message.body_enc = encryptInternalText("", `message:${message.id}:body`);
        message.attachments = [];
        message.updated_at = new Date().toISOString();
      } else {
        const deletedFor = deletedForSet(message.deleted_for);
        deletedFor.add(Number(user.id));
        message.deleted_for = [...deletedFor];
        message.updated_at = new Date().toISOString();
      }
      store.internal_messages[idx] = message;
      result = { ok: true, id: message.id, scope };
      return store;
    },
    { forceRefresh: true },
  );
  return result;
}

export async function deleteInternalThreadForMe(user, threadId) {
  let result = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const thread = store.internal_message_threads.find(
        (candidate) => String(candidate.id) === String(threadId),
      );
      assertThreadAccess(thread, user);
      const deletedFor = deletedForSet(thread.deleted_for);
      deletedFor.add(Number(user.id));
      thread.deleted_for = [...deletedFor];
      const unread = unreadMap(thread);
      unread[String(user.id)] = 0;
      thread.unread = unread;
      thread.updated_at = new Date().toISOString();
      result = { ok: true, id: thread.id };
      return store;
    },
    { forceRefresh: true },
  );
  return result;
}
