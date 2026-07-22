import assert from "node:assert/strict";
import test from "node:test";
import { readStore, resetMemoryStoreForTests } from "../store.js";
import {
  createInternalThread,
  getInternalThread,
  listInternalThreads,
  replyInternalThread,
} from "./service.js";

process.env.UXGUARD_TEST = "1";
process.env.INTERNAL_MESSAGE_ENCRYPTION_KEY = "internal-message-test-key";

test("private messages are encrypted and isolated to their user and admins", async () => {
  resetMemoryStoreForTests();
  const initial = await readStore();
  const admin = initial.users.find((user) => user.role === "admin");
  const members = initial.users.filter((user) => user.role !== "admin");
  assert.ok(admin);
  assert.ok(members[0]);

  const owner = members[0];
  const outsider = members[1] || {
    id: 987654,
    role: "professional",
    name: "Outsider",
    email: "outsider@example.com",
  };
  const created = await createInternalThread(owner, {
    subject: "Private support request",
    body: "User-only sensitive content",
  });

  const adminList = await listInternalThreads(admin);
  assert.ok(adminList.threads.some((thread) => thread.id === created.thread.id));

  const adminView = await getInternalThread(admin, created.thread.id);
  assert.equal(adminView.messages[0].body, "User-only sensitive content");

  await replyInternalThread(admin, created.thread.id, {
    body: "Admin-only private response",
  });
  const ownerView = await getInternalThread(owner, created.thread.id);
  assert.equal(ownerView.messages.length, 2);
  assert.equal(ownerView.messages[1].body, "Admin-only private response");

  await assert.rejects(
    () => getInternalThread(outsider, created.thread.id),
    (error) => error?.status === 403,
  );

  const raw = await readStore({ forceRefresh: true });
  const serialized = JSON.stringify({
    threads: raw.internal_message_threads,
    messages: raw.internal_messages,
  });
  assert.equal(serialized.includes("Private support request"), false);
  assert.equal(serialized.includes("User-only sensitive content"), false);
  assert.equal(serialized.includes("Admin-only private response"), false);
});

test("admin-created conversation targets exactly one user", async () => {
  resetMemoryStoreForTests();
  const initial = await readStore();
  const admin = initial.users.find((user) => user.role === "admin");
  const members = initial.users.filter((user) => user.role !== "admin");
  assert.ok(admin);
  assert.ok(members[0]);

  const created = await createInternalThread(admin, {
    recipient_user_id: members[0].id,
    subject: "Account message",
    body: "This is only for the selected account.",
  });
  assert.equal(created.thread.user_id, Number(members[0].id));

  const ownerList = await listInternalThreads(members[0]);
  assert.ok(ownerList.threads.some((thread) => thread.id === created.thread.id));

  if (members[1]) {
    const otherList = await listInternalThreads(members[1]);
    assert.equal(otherList.threads.some((thread) => thread.id === created.thread.id), false);
  }
});
