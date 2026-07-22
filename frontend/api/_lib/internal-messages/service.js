import { randomUUID } from "node:crypto";
import { readStore, updateStore } from "../store.js";
import { createNotification } from "../community.js";
import { isAdmin } from "../roles.js";
import { sendInternalMessageNotificationEmail } from "../mail.js";
import { decryptInternalText, encryptInternalText } from "./crypto.js";

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

function publicUser(user) {
  return {
    id: Number(user.id),
    name: user.name || user.email || "User",
    email: user.email || "",
    role: user.role || "professional",
  };
}

function assertThreadAccess(thread, user) {
  if (!thread || thread.deleted_at) {
    throw httpError("Conversation not found.", 404, "THREAD_NOT_FOUND");
  }
  if (!isAdmin(user) && Number(thread.user_id) !== Number(user.id)) {
    throw httpError("You cannot access this conversation.", 403, "THREAD_FORBIDDEN");
  }
}

function decryptThread(thread, users) {
  const owner = users.find((u) => Number(u.id) === Number(thread.user_id));
  return {
    id: thread.id,
    user_id: Number(thread.user_id),
    user: owner ? publicUser(owner) : null,
    subject: decryptInternalText(thread.subject_enc, `thread:${thread.id}:subject`),
    created_by: Number(thread.created_by),
    last_message_at: thread.last_message_at,
    unread_user: Number(thread.unread_user) || 0,
    unread_admin: Number(thread.unread_admin) || 0,
    created_at: thread.created_at,
    updated_at: thread.updated_at,
  };
}

function decryptMessage(message, users) {
  const sender = users.find((u) => Number(u.id) === Number(message.sender_user_id));
  return {
    id: message.id,
    thread_id: message.thread_id,
    sender_user_id: Number(message.sender_user_id),
    sender: sender ? publicUser(sender) : null,
    sender_role: message.sender_role,
    body: decryptInternalText(message.body_enc, `message:${message.id}:body`),
    created_at: message.created_at,
  };
}

function threadDetail(store, thread) {
  return {
    thread: decryptThread(thread, store.users || []),
    messages: store.internal_messages
      .filter((message) => String(message.thread_id) === String(thread.id))
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((message) => decryptMessage(message, store.users || [])),
  };
}

function adminUsers(store) {
  return (store.users || []).filter((user) => isAdmin(user));
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
      // Message is already saved; notifications are best effort.
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
        // Never fail private message delivery because external email is unavailable.
      }
    }
  }
}

export async function listInternalThreads(user) {
  const store = ensureCollections(await readStore({ forceRefresh: true }));
  const threads = store.internal_message_threads
    .filter(
      (thread) =>
        !thread.deleted_at &&
        (isAdmin(user) || Number(thread.user_id) === Number(user.id)),
    )
    .sort((a, b) => String(b.last_message_at).localeCompare(String(a.last_message_at)))
    .map((thread) => decryptThread(thread, store.users || []));

  return {
    threads,
    unread_count: threads.reduce(
      (sum, thread) => sum + (isAdmin(user) ? thread.unread_admin : thread.unread_user),
      0,
    ),
    users: isAdmin(user)
      ? (store.users || [])
          .filter((candidate) => !isAdmin(candidate) && candidate.email)
          .map(publicUser)
          .sort((a, b) => a.name.localeCompare(b.name))
      : undefined,
  };
}

export async function getInternalThread(user, threadId, { markRead = true } = {}) {
  const currentStore = ensureCollections(await readStore({ forceRefresh: true }));
  const currentThread = currentStore.internal_message_threads.find(
    (candidate) => String(candidate.id) === String(threadId),
  );
  assertThreadAccess(currentThread, user);
  const unread = isAdmin(user) ? currentThread.unread_admin : currentThread.unread_user;
  if (!markRead || !Number(unread)) {
    return threadDetail(currentStore, currentThread);
  }

  let result = null;
  await updateStore(
    (store) => {
      ensureCollections(store);
      const thread = store.internal_message_threads.find(
        (candidate) => String(candidate.id) === String(threadId),
      );
      assertThreadAccess(thread, user);
      if (markRead) {
        if (isAdmin(user)) thread.unread_admin = 0;
        else thread.unread_user = 0;
        thread.updated_at = new Date().toISOString();
      }
      result = threadDetail(store, thread);
      return store;
    },
    { forceRefresh: true },
  );
  return result;
}

export async function createInternalThread(user, payload = {}) {
  const subject = cleanText(payload.subject, 200);
  const body = cleanText(payload.body || payload.message, 20000);
  if (!subject || !body) {
    throw httpError("Subject and message are required.");
  }

  let saved = null;
  let recipients = [];
  await updateStore(
    (store) => {
      ensureCollections(store);
      const ownerId = isAdmin(user) ? Number(payload.recipient_user_id) : Number(user.id);
      const owner = (store.users || []).find((candidate) => Number(candidate.id) === ownerId);
      if (!owner || isAdmin(owner)) {
        throw httpError(
          "Choose a valid user for this conversation.",
          400,
          "INVALID_RECIPIENT",
        );
      }

      const now = new Date().toISOString();
      const threadId = randomUUID();
      const messageId = randomUUID();
      const thread = {
        id: threadId,
        user_id: ownerId,
        subject_enc: encryptInternalText(subject, `thread:${threadId}:subject`),
        created_by: Number(user.id),
        last_message_at: now,
        unread_user: isAdmin(user) ? 1 : 0,
        unread_admin: isAdmin(user) ? 0 : 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      const message = {
        id: messageId,
        thread_id: threadId,
        sender_user_id: Number(user.id),
        sender_role: isAdmin(user) ? "admin" : "user",
        body_enc: encryptInternalText(body, `message:${messageId}:body`),
        created_at: now,
        updated_at: now,
      };
      store.internal_message_threads.push(thread);
      store.internal_messages.push(message);
      saved = {
        thread: decryptThread(thread, store.users || []),
        messages: [decryptMessage(message, store.users || [])],
      };
      recipients = isAdmin(user) ? [owner] : adminUsers(store);
      return store;
    },
    { forceRefresh: true },
  );

  await notifyRecipients({ threadId: saved.thread.id, sender: user, recipients });
  return saved;
}

export async function replyInternalThread(user, threadId, payload = {}) {
  const body = cleanText(payload.body || payload.message, 20000);
  if (!body) throw httpError("Message is required.");

  let saved = null;
  let recipients = [];
  await updateStore(
    (store) => {
      ensureCollections(store);
      const thread = store.internal_message_threads.find(
        (candidate) => String(candidate.id) === String(threadId),
      );
      assertThreadAccess(thread, user);
      const now = new Date().toISOString();
      const messageId = randomUUID();
      const message = {
        id: messageId,
        thread_id: thread.id,
        sender_user_id: Number(user.id),
        sender_role: isAdmin(user) ? "admin" : "user",
        body_enc: encryptInternalText(body, `message:${messageId}:body`),
        created_at: now,
        updated_at: now,
      };
      store.internal_messages.push(message);
      thread.last_message_at = now;
      thread.updated_at = now;
      if (isAdmin(user)) {
        thread.unread_user = Number(thread.unread_user || 0) + 1;
        thread.unread_admin = 0;
        const owner = (store.users || []).find(
          (candidate) => Number(candidate.id) === Number(thread.user_id),
        );
        recipients = owner ? [owner] : [];
      } else {
        thread.unread_admin = Number(thread.unread_admin || 0) + 1;
        thread.unread_user = 0;
        recipients = adminUsers(store);
      }
      saved = decryptMessage(message, store.users || []);
      return store;
    },
    { forceRefresh: true },
  );

  await notifyRecipients({ threadId, sender: user, recipients });
  return saved;
}
