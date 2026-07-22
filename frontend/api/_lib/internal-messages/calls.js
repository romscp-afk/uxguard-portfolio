import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { readStore, updateStore } from "../store.js";
import { createNotification } from "../community.js";
import { sendIncomingCallEmail } from "../mail.js";

const RING_TIMEOUT_MS = 60_000;
const SIGNAL_PREFIX = "uxguard/calls";

/** @type {Map<string, any>} */
const memorySignals = globalThis.__uxguardCallSignals || new Map();
globalThis.__uxguardCallSignals = memorySignals;

function httpError(message, status = 400, code = "CALL_ERROR") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function sameId(a, b) {
  return Number(a) === Number(b);
}

function ensureCollections(store) {
  store.internal_call_sessions = store.internal_call_sessions || [];
  store.internal_message_threads = store.internal_message_threads || [];
  return store;
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

function threadParticipants(thread) {
  if (Array.isArray(thread.participant_ids) && thread.participant_ids.length) {
    return [...new Set(thread.participant_ids.map(Number).filter(Number.isFinite))];
  }
  const ids = [Number(thread.user_id), Number(thread.created_by)].filter(Number.isFinite);
  return [...new Set(ids)];
}

function assertCallParticipant(call, userId) {
  if (!sameId(call.caller_user_id, userId) && !sameId(call.callee_user_id, userId)) {
    throw httpError("Forbidden", 403, "CALL_FORBIDDEN");
  }
}

function serializeCall(call, users = []) {
  return {
    id: call.id,
    thread_id: call.thread_id,
    caller_user_id: Number(call.caller_user_id),
    callee_user_id: Number(call.callee_user_id),
    caller: publicUser(users.find((u) => sameId(u.id, call.caller_user_id))),
    callee: publicUser(users.find((u) => sameId(u.id, call.callee_user_id))),
    media: {
      audio: call.media?.audio !== false,
      video: Boolean(call.media?.video),
    },
    status: call.status,
    created_at: call.created_at,
    accepted_at: call.accepted_at || null,
    ended_at: call.ended_at || null,
    ended_by: call.ended_by == null ? null : Number(call.ended_by),
    end_reason: call.end_reason || null,
  };
}

function emptySignal(callId) {
  return {
    call_id: callId,
    version: 0,
    offer: null,
    answer: null,
    ice: [],
    updated_at: new Date().toISOString(),
  };
}

function signalPath(callId) {
  return `${SIGNAL_PREFIX}/${callId}/signal.json`;
}

async function readSignal(callId) {
  if (process.env.UXGUARD_TEST === "1" || !process.env.BLOB_READ_WRITE_TOKEN) {
    return memorySignals.get(callId) || emptySignal(callId);
  }
  try {
    const result = await get(signalPath(callId), { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return emptySignal(callId);
    }
    const text = await new Response(result.stream).text();
    return text ? JSON.parse(text) : emptySignal(callId);
  } catch {
    return emptySignal(callId);
  }
}

async function writeSignal(callId, signal) {
  const next = {
    ...signal,
    call_id: callId,
    updated_at: new Date().toISOString(),
  };
  if (process.env.UXGUARD_TEST === "1" || !process.env.BLOB_READ_WRITE_TOKEN) {
    memorySignals.set(callId, next);
    return next;
  }
  await put(signalPath(callId), JSON.stringify(next), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return next;
}

export function resetCallSignalsForTests() {
  if (process.env.UXGUARD_TEST !== "1") {
    throw new Error("resetCallSignalsForTests requires UXGUARD_TEST=1");
  }
  memorySignals.clear();
}

export function getIceServers() {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
  const turnUrls = String(process.env.TURN_URLS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (turnUrls.length) {
    servers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME || undefined,
      credential: process.env.TURN_CREDENTIAL || undefined,
    });
  }
  return servers;
}

async function findThread(store, threadId) {
  return (store.internal_message_threads || []).find((t) => String(t.id) === String(threadId)) || null;
}

async function maybeMissCall(call) {
  if (call.status !== "ringing") return call;
  const age = Date.now() - Date.parse(call.created_at);
  if (!Number.isFinite(age) || age < RING_TIMEOUT_MS) return call;

  let updated = call;
  await updateStore((store) => {
    ensureCollections(store);
    const idx = store.internal_call_sessions.findIndex((c) => String(c.id) === String(call.id));
    if (idx === -1) {
      store.__uxguardSkipWrite = true;
      return store;
    }
    const current = store.internal_call_sessions[idx];
    if (current.status !== "ringing") {
      store.__uxguardSkipWrite = true;
      updated = current;
      return store;
    }
    updated = {
      ...current,
      status: "missed",
      ended_at: new Date().toISOString(),
      end_reason: "timeout",
    };
    store.internal_call_sessions[idx] = updated;
    return store;
  });
  return updated;
}

export async function listActiveCalls(user) {
  const store = ensureCollections(await readStore({ forceRefresh: true }));
  const uid = Number(user.id);
  const active = [];
  for (const call of store.internal_call_sessions) {
    if (!sameId(call.caller_user_id, uid) && !sameId(call.callee_user_id, uid)) continue;
    const current = await maybeMissCall(call);
    if (["ringing", "accepted", "connected"].includes(current.status)) {
      active.push(serializeCall(current, store.users || []));
    }
  }
  return {
    calls: active.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    ice_servers: getIceServers(),
  };
}

export async function createCall(user, payload = {}) {
  const threadId = String(payload.thread_id || "").trim();
  if (!threadId) throw httpError("thread_id is required.");
  const video = Boolean(payload.video);
  const audio = payload.audio !== false;

  const store = ensureCollections(await readStore({ forceRefresh: true }));
  const thread = await findThread(store, threadId);
  if (!thread) throw httpError("Conversation not found.", 404, "THREAD_NOT_FOUND");

  const participants = threadParticipants(thread);
  if (!participants.includes(Number(user.id))) {
    throw httpError("Forbidden", 403, "CALL_FORBIDDEN");
  }
  const calleeId = participants.find((id) => !sameId(id, user.id));
  if (!calleeId) throw httpError("Cannot start a call without another participant.");

  const existing = store.internal_call_sessions.find(
    (call) =>
      String(call.thread_id) === threadId &&
      ["ringing", "accepted", "connected"].includes(call.status) &&
      (sameId(call.caller_user_id, user.id) || sameId(call.callee_user_id, user.id)),
  );
  if (existing) {
    const current = await maybeMissCall(existing);
    if (["ringing", "accepted", "connected"].includes(current.status)) {
      throw httpError("A call is already in progress for this chat.", 409, "CALL_IN_PROGRESS");
    }
  }

  const now = new Date().toISOString();
  const call = {
    id: randomUUID(),
    thread_id: threadId,
    caller_user_id: Number(user.id),
    callee_user_id: Number(calleeId),
    media: { audio, video },
    status: "ringing",
    created_at: now,
    accepted_at: null,
    ended_at: null,
    ended_by: null,
    end_reason: null,
  };

  await updateStore((draft) => {
    ensureCollections(draft);
    draft.internal_call_sessions.push(call);
    return draft;
  });
  await writeSignal(call.id, emptySignal(call.id));

  const callee = (store.users || []).find((u) => sameId(u.id, calleeId));
  const callerName = user.name || user.email || "Someone";
  const link = `/admin/messages?thread=${encodeURIComponent(threadId)}&call=${encodeURIComponent(call.id)}`;
  try {
    await createNotification({
      userId: calleeId,
      type: "incoming_call",
      title: video ? "Incoming video call" : "Incoming voice call",
      message: `${callerName} is calling you.`,
      link,
    });
  } catch {
    // best effort
  }
  if (callee?.email) {
    try {
      await sendIncomingCallEmail({
        to: callee.email,
        userName: callee.name,
        callerName,
        video,
        conversationUrl: `${String(process.env.PUBLIC_APP_URL || "https://uxguard.studio").replace(/\/$/, "")}${link}`,
      });
    } catch {
      // best effort
    }
  }

  return {
    call: serializeCall(call, store.users || []),
    ice_servers: getIceServers(),
  };
}

export async function getCall(user, callId, { since = 0 } = {}) {
  const store = ensureCollections(await readStore({ forceRefresh: true }));
  let call = store.internal_call_sessions.find((c) => String(c.id) === String(callId));
  if (!call) throw httpError("Call not found.", 404, "CALL_NOT_FOUND");
  assertCallParticipant(call, user.id);
  call = await maybeMissCall(call);

  const signal = await readSignal(callId);
  const sinceVersion = Number(since) || 0;
  return {
    call: serializeCall(call, store.users || []),
    signal: {
      version: signal.version || 0,
      offer: signal.offer || null,
      answer: signal.answer || null,
      ice: (signal.ice || []).filter((item) => Number(item.version || item.seq || 0) > sinceVersion),
    },
    ice_servers: getIceServers(),
  };
}

export async function acceptCall(user, callId) {
  const store = ensureCollections(await readStore({ forceRefresh: true }));
  const call = store.internal_call_sessions.find((c) => String(c.id) === String(callId));
  if (!call) throw httpError("Call not found.", 404, "CALL_NOT_FOUND");
  assertCallParticipant(call, user.id);
  if (!sameId(call.callee_user_id, user.id)) {
    throw httpError("Only the callee can accept this call.", 403, "CALL_FORBIDDEN");
  }
  const current = await maybeMissCall(call);
  if (current.status === "accepted" || current.status === "connected") {
    return {
      call: serializeCall(current, store.users || []),
      ice_servers: getIceServers(),
    };
  }
  if (current.status !== "ringing") {
    throw httpError("Call is no longer ringing.", 409, "CALL_NOT_RINGING");
  }

  let updated = current;
  await updateStore((draft) => {
    ensureCollections(draft);
    const idx = draft.internal_call_sessions.findIndex((c) => String(c.id) === String(callId));
    if (idx === -1) throw httpError("Call not found.", 404, "CALL_NOT_FOUND");
    const latest = draft.internal_call_sessions[idx];
    if (latest.status === "accepted" || latest.status === "connected") {
      updated = latest;
      draft.__uxguardSkipWrite = true;
      return draft;
    }
    if (latest.status !== "ringing") {
      throw httpError("Call is no longer ringing.", 409, "CALL_NOT_RINGING");
    }
    updated = {
      ...latest,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    };
    draft.internal_call_sessions[idx] = updated;
    return draft;
  });

  return {
    call: serializeCall(updated, (await readStore()).users || store.users || []),
    ice_servers: getIceServers(),
  };
}

export async function rejectCall(user, callId) {
  return endCall(user, callId, { reason: "reject" });
}

export async function endCall(user, callId, { reason = "hangup" } = {}) {
  const store = ensureCollections(await readStore({ forceRefresh: true }));
  const call = store.internal_call_sessions.find((c) => String(c.id) === String(callId));
  if (!call) throw httpError("Call not found.", 404, "CALL_NOT_FOUND");
  assertCallParticipant(call, user.id);

  if (["ended", "rejected", "missed", "failed"].includes(call.status)) {
    return { call: serializeCall(call, store.users || []) };
  }

  const status = reason === "reject" ? "rejected" : reason === "error" ? "failed" : "ended";
  let updated = call;
  await updateStore((draft) => {
    ensureCollections(draft);
    const idx = draft.internal_call_sessions.findIndex((c) => String(c.id) === String(callId));
    if (idx === -1) throw httpError("Call not found.", 404, "CALL_NOT_FOUND");
    updated = {
      ...draft.internal_call_sessions[idx],
      status,
      ended_at: new Date().toISOString(),
      ended_by: Number(user.id),
      end_reason: reason,
    };
    draft.internal_call_sessions[idx] = updated;
    return draft;
  });

  return { call: serializeCall(updated, store.users || []) };
}

export async function markCallConnected(user, callId) {
  const store = ensureCollections(await readStore({ forceRefresh: true }));
  const call = store.internal_call_sessions.find((c) => String(c.id) === String(callId));
  if (!call) throw httpError("Call not found.", 404, "CALL_NOT_FOUND");
  assertCallParticipant(call, user.id);
  if (!["accepted", "connected"].includes(call.status)) {
    return { call: serializeCall(call, store.users || []) };
  }
  if (call.status === "connected") {
    return { call: serializeCall(call, store.users || []) };
  }

  let updated = call;
  await updateStore((draft) => {
    ensureCollections(draft);
    const idx = draft.internal_call_sessions.findIndex((c) => String(c.id) === String(callId));
    if (idx === -1) throw httpError("Call not found.", 404, "CALL_NOT_FOUND");
    updated = { ...draft.internal_call_sessions[idx], status: "connected" };
    draft.internal_call_sessions[idx] = updated;
    return draft;
  });
  return { call: serializeCall(updated, store.users || []) };
}

export async function postCallSignal(user, callId, payload = {}) {
  const store = ensureCollections(await readStore({ forceRefresh: true }));
  const call = store.internal_call_sessions.find((c) => String(c.id) === String(callId));
  if (!call) throw httpError("Call not found.", 404, "CALL_NOT_FOUND");
  assertCallParticipant(call, user.id);
  if (["ended", "rejected", "missed", "failed"].includes(call.status)) {
    throw httpError("Call has ended.", 409, "CALL_ENDED");
  }

  const signal = await readSignal(callId);
  const next = {
    ...signal,
    ice: [...(signal.ice || [])],
  };
  let bumped = false;

  if (payload.offer && typeof payload.offer === "object") {
    if (!sameId(call.caller_user_id, user.id)) {
      throw httpError("Only the caller can send the offer.", 403, "CALL_FORBIDDEN");
    }
    next.version = (Number(next.version) || 0) + 1;
    next.offer = {
      type: payload.offer.type,
      sdp: payload.offer.sdp,
      from_user_id: Number(user.id),
      version: next.version,
      created_at: new Date().toISOString(),
    };
    bumped = true;
  }

  if (payload.answer && typeof payload.answer === "object") {
    if (!sameId(call.callee_user_id, user.id)) {
      throw httpError("Only the callee can send the answer.", 403, "CALL_FORBIDDEN");
    }
    next.version = (Number(next.version) || 0) + 1;
    next.answer = {
      type: payload.answer.type,
      sdp: payload.answer.sdp,
      from_user_id: Number(user.id),
      version: next.version,
      created_at: new Date().toISOString(),
    };
    bumped = true;
  }

  if (payload.candidate && typeof payload.candidate === "object") {
    next.version = (Number(next.version) || 0) + 1;
    next.ice.push({
      id: randomUUID(),
      from_user_id: Number(user.id),
      candidate: payload.candidate,
      version: next.version,
      created_at: new Date().toISOString(),
    });
    // Keep the signal doc small
    if (next.ice.length > 80) next.ice = next.ice.slice(-80);
    bumped = true;
  }

  if (!bumped) throw httpError("Signal payload must include offer, answer, or candidate.");

  const saved = await writeSignal(callId, next);
  return {
    version: saved.version,
    offer: saved.offer,
    answer: saved.answer,
  };
}
