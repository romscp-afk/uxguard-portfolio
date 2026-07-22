import assert from "node:assert/strict";
import test from "node:test";
import { readStore, resetMemoryStoreForTests } from "../store.js";
import { createInternalThread } from "./service.js";
import {
  acceptCall,
  createCall,
  endCall,
  getCall,
  listActiveCalls,
  postCallSignal,
  resetCallSignalsForTests,
} from "./calls.js";

process.env.UXGUARD_TEST = "1";
process.env.INTERNAL_MESSAGE_ENCRYPTION_KEY = "internal-message-test-key";

test("caller and callee can ring, accept, exchange signals, and hang up", async () => {
  resetMemoryStoreForTests();
  resetCallSignalsForTests();
  const initial = await readStore();
  const members = initial.users.filter((user) => user.email);
  const a = members[0];
  const b = members[1];

  const thread = await createInternalThread(a, {
    recipient_user_id: b.id,
    body: "Ready for a call",
  });

  const started = await createCall(a, { thread_id: thread.thread.id, video: true });
  assert.equal(started.call.status, "ringing");
  assert.equal(started.call.caller_user_id, Number(a.id));
  assert.equal(started.call.callee_user_id, Number(b.id));
  assert.ok(started.ice_servers.length >= 1);

  const bActive = await listActiveCalls(b);
  assert.ok(bActive.calls.some((call) => call.id === started.call.id));

  const accepted = await acceptCall(b, started.call.id);
  assert.equal(accepted.call.status, "accepted");

  await postCallSignal(a, started.call.id, {
    offer: { type: "offer", sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n" },
  });
  await postCallSignal(b, started.call.id, {
    answer: { type: "answer", sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n" },
  });
  await postCallSignal(a, started.call.id, {
    candidate: { candidate: "candidate:1 1 UDP 2122252543 1.2.3.4 12345 typ host", sdpMid: "0" },
  });

  const snapshot = await getCall(b, started.call.id, { since: 0 });
  assert.ok(snapshot.signal.offer);
  assert.ok(snapshot.signal.answer);
  assert.ok(snapshot.signal.ice.length >= 1);

  // Concurrent ICE must not wipe SDP
  await Promise.all([
    postCallSignal(a, started.call.id, {
      candidate: { candidate: "candidate:2 1 UDP 1 1.1.1.1 1111 typ host", sdpMid: "0" },
    }),
    postCallSignal(b, started.call.id, {
      candidate: { candidate: "candidate:3 1 UDP 1 2.2.2.2 2222 typ host", sdpMid: "0" },
    }),
  ]);
  const afterIce = await getCall(a, started.call.id, { since: 0 });
  assert.ok(afterIce.signal.offer?.sdp);
  assert.ok(afterIce.signal.answer?.sdp);

  // Concurrent offer + answer writes must both survive store merge
  await Promise.all([
    postCallSignal(a, started.call.id, {
      offer: { type: "offer", sdp: "v=0\r\no=- 9 0 IN IP4 127.0.0.1\r\n" },
    }),
    postCallSignal(b, started.call.id, {
      answer: { type: "answer", sdp: "v=0\r\no=- 10 1 IN IP4 127.0.0.1\r\n" },
    }),
  ]);
  const afterSdp = await getCall(b, started.call.id, { since: 0 });
  assert.ok(afterSdp.signal.offer?.sdp?.includes("o=- 9"));
  assert.ok(afterSdp.signal.answer?.sdp?.includes("o=- 10"));

  const ended = await endCall(a, started.call.id, { reason: "hangup" });
  assert.equal(ended.call.status, "ended");

  const after = await listActiveCalls(b);
  assert.equal(
    after.calls.some((call) => call.id === started.call.id),
    false,
  );
});
