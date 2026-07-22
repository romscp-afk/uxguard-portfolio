import assert from "node:assert/strict";
import test from "node:test";
import { readStore, resetMemoryStoreForTests } from "../store.js";
import {
  createInternalThread,
  deleteInternalMessage,
  deleteInternalThreadForMe,
  editInternalMessage,
  getInternalThread,
  listInternalThreads,
  replyInternalThread,
} from "./service.js";

process.env.UXGUARD_TEST = "1";
process.env.INTERNAL_MESSAGE_ENCRYPTION_KEY = "internal-message-test-key";

test("any user can chat with another user and outsiders are blocked", async () => {
  resetMemoryStoreForTests();
  const initial = await readStore();
  const members = initial.users.filter((user) => user.email);
  assert.ok(members.length >= 2);
  const a = members[0];
  const b = members[1];
  const outsider = members[2] || {
    id: 987654,
    role: "professional",
    name: "Outsider",
    email: "outsider@example.com",
  };

  const created = await createInternalThread(a, {
    recipient_user_id: b.id,
    subject: "Hello peer",
    body: "Peer-to-peer sensitive content",
  });
  assert.ok(created.thread.participant_ids.includes(Number(a.id)));
  assert.ok(created.thread.participant_ids.includes(Number(b.id)));

  const bList = await listInternalThreads(b);
  assert.ok(bList.threads.some((thread) => thread.id === created.thread.id));
  assert.ok(bList.users.some((user) => Number(user.id) === Number(a.id)));

  await replyInternalThread(b, created.thread.id, { body: "Got it 👍" });
  const aView = await getInternalThread(a, created.thread.id);
  assert.equal(aView.messages.length, 2);
  assert.equal(aView.messages[1].body, "Got it 👍");

  await assert.rejects(
    () => getInternalThread(outsider, created.thread.id),
    (error) => error?.status === 403,
  );

  const raw = await readStore({ forceRefresh: true });
  const serialized = JSON.stringify({
    threads: raw.internal_message_threads,
    messages: raw.internal_messages,
  });
  assert.equal(serialized.includes("Peer-to-peer sensitive content"), false);
  assert.equal(serialized.includes("Got it"), false);
});

test("sender can edit and delete for everyone; receiver can hide only for self", async () => {
  resetMemoryStoreForTests();
  const initial = await readStore();
  const members = initial.users.filter((user) => user.email);
  const a = members[0];
  const b = members[1];
  assert.ok(a && b);

  const created = await createInternalThread(a, {
    recipient_user_id: b.id,
    body: "Original text",
  });
  const messageId = created.messages[0].id;

  const edited = await editInternalMessage(a, messageId, { body: "Edited text" });
  assert.equal(edited.body, "Edited text");
  assert.ok(edited.edited_at);

  await replyInternalThread(b, created.thread.id, { body: "Receiver message" });
  const bView = await getInternalThread(b, created.thread.id);
  const receiverMessage = bView.messages.find((m) => m.body === "Receiver message");
  assert.ok(receiverMessage);

  await deleteInternalMessage(a, receiverMessage.id, { scope: "me" });
  const aAfterHide = await getInternalThread(a, created.thread.id);
  assert.equal(
    aAfterHide.messages.some((m) => m.id === receiverMessage.id),
    false,
  );
  const bAfterHide = await getInternalThread(b, created.thread.id);
  assert.ok(bAfterHide.messages.some((m) => m.id === receiverMessage.id));

  await deleteInternalMessage(a, messageId, { scope: "all" });
  const both = await getInternalThread(b, created.thread.id);
  const deleted = both.messages.find((m) => m.id === messageId);
  assert.ok(deleted?.deleted);
});

test("hidden chat stays hidden for that user after others message", async () => {
  resetMemoryStoreForTests();
  const initial = await readStore();
  const members = initial.users.filter((user) => user.email);
  const a = members[0];
  const b = members[1];

  const created = await createInternalThread(a, {
    recipient_user_id: b.id,
    body: "hello",
  });

  await deleteInternalThreadForMe(a, created.thread.id);
  const aList = await listInternalThreads(a);
  assert.equal(
    aList.threads.some((thread) => thread.id === created.thread.id),
    false,
  );

  await replyInternalThread(b, created.thread.id, { body: "still here" });
  const aListAfter = await listInternalThreads(a);
  assert.equal(
    aListAfter.threads.some((thread) => thread.id === created.thread.id),
    false,
  );

  // Sender can reopen their own hidden chat by messaging again.
  const reopened = await createInternalThread(a, {
    recipient_user_id: b.id,
    body: "i'm back",
  });
  assert.equal(reopened.thread.id, created.thread.id);
  const aListReopened = await listInternalThreads(a);
  assert.ok(aListReopened.threads.some((thread) => thread.id === created.thread.id));
});

test("chat image attachments persist via dedicated chat file urls", async () => {
  resetMemoryStoreForTests();
  const initial = await readStore();
  const members = initial.users.filter((user) => user.email);
  const a = members[0];
  const b = members[1];

  const attachment = {
    url: "/api/v1/internal-messages/file/dXhndWFyZC9jaGF0LzEvZGVtby5qcGc",
    pathname: "uxguard/chat/1/demo.jpg",
    mime_type: "image/jpeg",
    size_bytes: 12000,
    name: "demo.jpg",
    width: 800,
    height: 600,
  };

  const created = await createInternalThread(a, {
    recipient_user_id: b.id,
    body: "",
    attachments: [attachment],
  });
  assert.equal(created.messages[0].attachments?.length, 1);
  assert.equal(created.messages[0].attachments[0].url, attachment.url);
  assert.equal(created.messages[0].attachments[0].pathname, attachment.pathname);

  const bView = await getInternalThread(b, created.thread.id);
  assert.equal(bView.messages[0].attachments?.[0]?.url, attachment.url);

  await assert.rejects(
    () =>
      createInternalThread(a, {
        recipient_user_id: b.id,
        attachments: [
          {
            url: "https://evil.example/x.jpg",
            mime_type: "image/jpeg",
            size_bytes: 100,
            name: "x.jpg",
          },
        ],
      }),
    (error) => error?.message?.includes("required") || error?.status === 400,
  );
});
