import { readStore, updateStore } from "./store.js";

export async function saveContactMessage({
  name,
  email,
  inquiryType,
  subject,
  message,
}) {
  let saved = null;
  await updateStore((store) => {
    const messages = Array.isArray(store.contact_messages) ? store.contact_messages : [];
    const nextId = messages.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;

    const entry = {
      id: nextId,
      name,
      email,
      inquiry_type: inquiryType || "General",
      subject,
      message,
      created_at: new Date().toISOString(),
      read: false,
    };

    store.contact_messages = [entry, ...messages].slice(0, 500);
    saved = entry;
    return store;
  });
  return saved;
}

export async function listContactMessages() {
  const store = await readStore();
  const messages = Array.isArray(store.contact_messages) ? store.contact_messages : [];
  return [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
