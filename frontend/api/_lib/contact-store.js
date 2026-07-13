import { randomUUID } from "node:crypto";
import { readStore, updateStore } from "./store.js";

const FOLDERS = new Set(["inbox", "sent", "drafts", "trash", "starred"]);

function nextId(messages) {
  return messages.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function nowIso() {
  return new Date().toISOString();
}

/** Normalize legacy contact rows into the mail-box shape. */
export function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = Number(raw.id);
  const direction = raw.direction || "inbound";
  const folder = raw.folder || (direction === "outbound" ? "sent" : "inbox");
  return {
    id,
    thread_id: raw.thread_id || String(id),
    parent_id: raw.parent_id ?? null,
    folder: raw.deleted_at ? "trash" : folder,
    direction,
    name: raw.name || raw.from_name || "",
    email: raw.email || raw.from_email || "",
    from_name: raw.from_name || (direction === "inbound" ? raw.name : "UXGuard Studio"),
    from_email:
      raw.from_email ||
      (direction === "inbound" ? raw.email : process.env.CONTACT_TO || "uxguardstudio@gmail.com"),
    to_name: raw.to_name || (direction === "outbound" ? raw.name : "UXGuard Studio"),
    to_email:
      raw.to_email ||
      (direction === "outbound" ? raw.email : process.env.CONTACT_TO || "uxguardstudio@gmail.com"),
    inquiry_type: raw.inquiry_type || "General",
    subject: raw.subject || "(No subject)",
    message: raw.message || "",
    created_at: raw.created_at || nowIso(),
    updated_at: raw.updated_at || raw.created_at || nowIso(),
    read: Boolean(raw.read),
    starred: Boolean(raw.starred),
    deleted_at: raw.deleted_at || null,
  };
}

function allNormalized(store) {
  const messages = Array.isArray(store.contact_messages) ? store.contact_messages : [];
  return messages.map(normalizeMessage).filter(Boolean);
}

export async function saveContactMessage({
  name,
  email,
  inquiryType,
  subject,
  message,
}) {
  let saved = null;
  await updateStore((store) => {
    store.contact_messages = store.contact_messages || [];
    const id = nextId(store.contact_messages);
    const entry = {
      id,
      thread_id: String(id),
      parent_id: null,
      folder: "inbox",
      direction: "inbound",
      name,
      email,
      from_name: name,
      from_email: email,
      to_name: "UXGuard Studio",
      to_email: process.env.CONTACT_TO || "uxguardstudio@gmail.com",
      inquiry_type: inquiryType || "General",
      subject,
      message,
      created_at: nowIso(),
      updated_at: nowIso(),
      read: false,
      starred: false,
      deleted_at: null,
    };
    store.contact_messages = [entry, ...store.contact_messages].slice(0, 1000);
    saved = normalizeMessage(entry);
    return store;
  });
  return saved;
}

export async function listContactMessages({ folder = "inbox", q = "" } = {}) {
  const store = await readStore();
  let list = allNormalized(store);

  if (folder === "starred") {
    list = list.filter((m) => m.starred && m.folder !== "trash");
  } else if (FOLDERS.has(folder)) {
    list = list.filter((m) => m.folder === folder);
  }

  const needle = String(q || "").trim().toLowerCase();
  if (needle) {
    list = list.filter((m) =>
      [m.subject, m.message, m.name, m.email, m.from_name, m.to_name]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }

  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getContactMailboxCounts() {
  const store = await readStore();
  const list = allNormalized(store);
  return {
    inbox: list.filter((m) => m.folder === "inbox").length,
    inbox_unread: list.filter((m) => m.folder === "inbox" && !m.read).length,
    sent: list.filter((m) => m.folder === "sent").length,
    drafts: list.filter((m) => m.folder === "drafts").length,
    trash: list.filter((m) => m.folder === "trash").length,
    starred: list.filter((m) => m.starred && m.folder !== "trash").length,
  };
}

export async function getContactMessage(id) {
  const store = await readStore();
  return allNormalized(store).find((m) => Number(m.id) === Number(id)) || null;
}

export async function getThreadMessages(threadId) {
  const store = await readStore();
  return allNormalized(store)
    .filter((m) => String(m.thread_id) === String(threadId) && m.folder !== "trash")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function updateContactMessage(id, patch = {}) {
  let updated = null;
  await updateStore((store) => {
    store.contact_messages = store.contact_messages || [];
    const idx = store.contact_messages.findIndex((m) => Number(m.id) === Number(id));
    if (idx < 0) return store;
    const current = { ...store.contact_messages[idx] };
    if (typeof patch.read === "boolean") current.read = patch.read;
    if (typeof patch.starred === "boolean") current.starred = patch.starred;
    if (patch.folder && FOLDERS.has(patch.folder) && patch.folder !== "starred") {
      current.folder = patch.folder;
      current.deleted_at = patch.folder === "trash" ? nowIso() : null;
    }
    if (typeof patch.subject === "string") current.subject = patch.subject.slice(0, 200);
    if (typeof patch.message === "string") current.message = patch.message.slice(0, 20000);
    current.updated_at = nowIso();
    store.contact_messages[idx] = current;
    updated = normalizeMessage(current);
    return store;
  });
  return updated;
}

export async function bulkUpdateContactMessages(ids, patch = {}) {
  const results = [];
  for (const id of ids) {
    const updated = await updateContactMessage(id, patch);
    if (updated) results.push(updated);
  }
  return results;
}

export async function deleteContactMessage(id, { permanent = false } = {}) {
  let result = null;
  await updateStore((store) => {
    store.contact_messages = store.contact_messages || [];
    const idx = store.contact_messages.findIndex((m) => Number(m.id) === Number(id));
    if (idx < 0) return store;
    const current = store.contact_messages[idx];
    if (permanent || current.folder === "trash" || current.deleted_at) {
      store.contact_messages = store.contact_messages.filter((m) => Number(m.id) !== Number(id));
      result = { id: Number(id), deleted: true, permanent: true };
      return store;
    }
    current.folder = "trash";
    current.deleted_at = nowIso();
    current.updated_at = nowIso();
    store.contact_messages[idx] = current;
    result = normalizeMessage(current);
    return store;
  });
  return result;
}

export async function bulkDeleteContactMessages(ids, { permanent = false } = {}) {
  const results = [];
  for (const id of ids) {
    const deleted = await deleteContactMessage(id, { permanent });
    if (deleted) results.push(deleted);
  }
  return results;
}

/**
 * Compose, reply, or save draft. Stays in-portal (no outbound email required).
 */
export async function composeContactMessage({
  toEmail,
  toName = "",
  subject,
  message,
  folder = "sent",
  parentId = null,
  threadId = null,
  inquiryType = "General",
  fromName = "UXGuard Studio",
  fromEmail = null,
}) {
  const adminEmail = fromEmail || process.env.CONTACT_TO || "uxguardstudio@gmail.com";
  const trimmedTo = String(toEmail || "").trim();
  const trimmedSubject = String(subject || "").trim() || "(No subject)";
  const trimmedMessage = String(message || "").trim();

  if (folder !== "drafts" && (!trimmedTo || !trimmedMessage)) {
    const error = new Error("Recipient and message are required.");
    error.status = 400;
    throw error;
  }

  let saved = null;
  await updateStore((store) => {
    store.contact_messages = store.contact_messages || [];
    let parent = null;
    if (parentId) {
      parent = store.contact_messages.find((m) => Number(m.id) === Number(parentId)) || null;
    }

    const id = nextId(store.contact_messages);
    const resolvedThread = threadId || parent?.thread_id || (parent ? String(parent.id) : String(id));
    const entry = {
      id,
      thread_id: String(resolvedThread),
      parent_id: parent ? Number(parent.id) : null,
      folder: folder === "drafts" ? "drafts" : "sent",
      direction: "outbound",
      name: toName || trimmedTo,
      email: trimmedTo,
      from_name: fromName,
      from_email: adminEmail,
      to_name: toName || trimmedTo,
      to_email: trimmedTo,
      inquiry_type: inquiryType || parent?.inquiry_type || "General",
      subject: trimmedSubject.startsWith("Re:") || !parent ? trimmedSubject : `Re: ${parent.subject || trimmedSubject}`,
      message: trimmedMessage,
      created_at: nowIso(),
      updated_at: nowIso(),
      read: true,
      starred: false,
      deleted_at: null,
      client_ref: randomUUID(),
    };

    // Mark parent inbound as read when replying
    if (parent) {
      const pIdx = store.contact_messages.findIndex((m) => Number(m.id) === Number(parent.id));
      if (pIdx >= 0) {
        store.contact_messages[pIdx] = {
          ...store.contact_messages[pIdx],
          read: true,
          updated_at: nowIso(),
        };
      }
    }

    store.contact_messages = [entry, ...store.contact_messages].slice(0, 1000);
    saved = normalizeMessage(entry);
    return store;
  });
  return saved;
}

export async function emptyTrash() {
  let removed = 0;
  await updateStore((store) => {
    const before = (store.contact_messages || []).length;
    store.contact_messages = (store.contact_messages || []).filter((m) => {
      const folder = m.folder || (m.deleted_at ? "trash" : "inbox");
      return folder !== "trash" && !m.deleted_at;
    });
    removed = before - store.contact_messages.length;
    return store;
  });
  return { removed };
}
