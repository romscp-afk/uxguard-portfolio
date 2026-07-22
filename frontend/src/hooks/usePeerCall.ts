import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type { InternalCallSession } from "../types";

type CallPhase =
  | "idle"
  | "outgoing"
  | "incoming"
  | "connecting"
  | "connected"
  | "ended";

type UsePeerCallOptions = {
  selfId?: number;
  onError?: (message: string) => void;
};

async function getMediaStream(wantVideo: boolean) {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: wantVideo,
    });
  } catch (err) {
    if (wantVideo) {
      return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw err;
  }
}

export function usePeerCall({ selfId, onError }: UsePeerCallOptions) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [activeCall, setActiveCall] = useState<InternalCallSession | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [busyAction, setBusyAction] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  const activeCallRef = useRef<InternalCallSession | null>(null);
  const phaseRef = useRef<CallPhase>("idle");
  const acceptingRef = useRef(false);
  const isCallerRef = useRef(false);
  const signalVersionRef = useRef(0);
  const appliedCandidatesRef = useRef(new Set<string>());
  const pendingRemoteIceRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);
  const syncingRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]);

  const setPhaseSafe = useCallback((next: CallPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const setActiveCallSafe = useCallback((call: InternalCallSession | null) => {
    activeCallRef.current = call;
    setActiveCall(call);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    stopPolling();
    stopTimer();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    callIdRef.current = null;
    acceptingRef.current = false;
    signalVersionRef.current = 0;
    appliedCandidatesRef.current.clear();
    pendingRemoteIceRef.current = [];
    offerSentRef.current = false;
    answerSentRef.current = false;
    syncingRef.current = false;
  }, [stopPolling, stopTimer]);

  const attachLocalVideo = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      void localVideoRef.current.play().catch(() => undefined);
    }
  }, []);

  const attachRemoteVideo = useCallback(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.muted = false;
      void remoteVideoRef.current.play().catch(() => undefined);
    }
  }, []);

  const reportError = useCallback(
    (err: unknown, fallback: string) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : fallback;
      onError?.(message);
    },
    [onError],
  );

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription) return;
    const queued = pendingRemoteIceRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    }
  }, []);

  const ensurePeer = useCallback(
    async (call: InternalCallSession, iceServers?: RTCIceServer[]) => {
      if (iceServers?.length) iceServersRef.current = iceServers;
      callIdRef.current = call.id;
      if (pcRef.current) {
        attachLocalVideo();
        attachRemoteVideo();
        return pcRef.current;
      }

      let stream = localStreamRef.current;
      if (!stream || stream.getTracks().every((track) => track.readyState === "ended")) {
        stream = await getMediaStream(Boolean(call.media.video));
        localStreamRef.current = stream;
      }
      const hasVideo = stream.getVideoTracks().length > 0;
      setCameraOff(!hasVideo);
      attachLocalVideo();

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcRef.current = pc;
      remoteStreamRef.current = new MediaStream();

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      pc.ontrack = (event) => {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        const inbound = event.streams[0];
        if (inbound) {
          for (const track of inbound.getTracks()) {
            const already = remoteStreamRef.current.getTracks().some((t) => t.id === track.id);
            if (!already) remoteStreamRef.current.addTrack(track);
          }
        } else if (event.track) {
          const already = remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id);
          if (!already) remoteStreamRef.current.addTrack(event.track);
        }
        attachRemoteVideo();
      };

      pc.onicecandidate = (event) => {
        const id = callIdRef.current;
        if (!event.candidate || !id) return;
        // Wait until we have a local description so candidates belong to the SDP.
        if (!pc.localDescription) return;
        void api
          .callAction(id, "signal", { candidate: event.candidate.toJSON() })
          .catch(() => undefined);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setPhaseSafe("connected");
          const id = callIdRef.current;
          if (id) void api.callAction(id, "connected").catch(() => undefined);
          if (!timerRef.current) {
            setElapsedSec(0);
            timerRef.current = window.setInterval(() => {
              setElapsedSec((value) => value + 1);
            }, 1000);
          }
          attachRemoteVideo();
        }
      };

      return pc;
    },
    [attachLocalVideo, attachRemoteVideo, setPhaseSafe],
  );

  const applySignals = useCallback(
    async (call: InternalCallSession, isCaller: boolean) => {
      if (syncingRef.current) return activeCallRef.current || call;
      syncingRef.current = true;
      try {
        const snapshot = await api.getCall(call.id, signalVersionRef.current);
        if (snapshot.ice_servers?.length) iceServersRef.current = snapshot.ice_servers;
        setActiveCallSafe(snapshot.call);

        if (["ended", "rejected", "missed", "failed"].includes(snapshot.call.status)) {
          if (acceptingRef.current) return snapshot.call;
          setPhaseSafe("ended");
          cleanupMedia();
          window.setTimeout(() => {
            setPhaseSafe("idle");
            setActiveCallSafe(null);
          }, 1200);
          return snapshot.call;
        }

        if (!isCaller && snapshot.call.status === "ringing") {
          return snapshot.call;
        }

        if (snapshot.call.status === "accepted" || snapshot.call.status === "connected") {
          if (phaseRef.current === "incoming" || phaseRef.current === "outgoing") {
            setPhaseSafe("connecting");
          } else if (phaseRef.current !== "connected") {
            setPhaseSafe("connecting");
          }
        }

        const pc = await ensurePeer(snapshot.call, snapshot.ice_servers);
        const { signal } = snapshot;

        // Caller: keep publishing offer until the server has it.
        if (isCaller && ["accepted", "connected"].includes(snapshot.call.status)) {
          if (!signal.offer) {
            if (!pc.localDescription || pc.localDescription.type !== "offer") {
              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: Boolean(snapshot.call.media.video),
              });
              await pc.setLocalDescription(offer);
            }
            await api.callAction(call.id, "signal", {
              offer: {
                type: pc.localDescription!.type,
                sdp: pc.localDescription!.sdp,
              },
            });
            offerSentRef.current = true;
          } else {
            offerSentRef.current = true;
          }
        }

        // Callee: apply offer and publish answer until server has it.
        if (!isCaller && signal.offer) {
          const needRemote =
            !pc.currentRemoteDescription ||
            pc.currentRemoteDescription.sdp !== signal.offer.sdp;
          if (needRemote) {
            await pc.setRemoteDescription({
              type: signal.offer.type,
              sdp: signal.offer.sdp,
            });
            await flushPendingIce(pc);
          }
          if (!signal.answer) {
            if (!pc.localDescription || pc.localDescription.type !== "answer") {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
            }
            await api.callAction(call.id, "signal", {
              answer: {
                type: pc.localDescription!.type,
                sdp: pc.localDescription!.sdp,
              },
            });
            answerSentRef.current = true;
          } else {
            answerSentRef.current = true;
          }
        }

        // Caller: apply answer.
        if (isCaller && signal.answer) {
          const needRemote =
            !pc.currentRemoteDescription ||
            pc.currentRemoteDescription.sdp !== signal.answer.sdp;
          if (needRemote) {
            await pc.setRemoteDescription({
              type: signal.answer.type,
              sdp: signal.answer.sdp,
            });
            await flushPendingIce(pc);
          }
        }

        for (const item of signal.ice || []) {
          if (Number(item.from_user_id) === Number(selfId)) continue;
          if (appliedCandidatesRef.current.has(item.id)) continue;
          appliedCandidatesRef.current.add(item.id);
          if (!pc.remoteDescription) {
            pendingRemoteIceRef.current.push(item.candidate);
            continue;
          }
          try {
            await pc.addIceCandidate(item.candidate);
          } catch {
            // ignore stale candidates
          }
        }

        signalVersionRef.current = Math.max(signalVersionRef.current, signal.version || 0);
        attachRemoteVideo();
        return snapshot.call;
      } finally {
        syncingRef.current = false;
      }
    },
    [
      attachRemoteVideo,
      cleanupMedia,
      ensurePeer,
      flushPendingIce,
      selfId,
      setActiveCallSafe,
      setPhaseSafe,
    ],
  );

  const startPolling = useCallback(
    (call: InternalCallSession, isCaller: boolean, intervalMs = 800) => {
      stopPolling();
      isCallerRef.current = isCaller;
      const tick = () => {
        const current = activeCallRef.current || call;
        void applySignals(current, isCallerRef.current).catch((err) =>
          reportError(err, "Call sync failed."),
        );
      };
      tick();
      pollRef.current = window.setInterval(tick, intervalMs);
    },
    [applySignals, reportError, stopPolling],
  );

  const startCall = useCallback(
    async (threadId: string, video: boolean) => {
      try {
        setBusyAction(true);
        cleanupMedia();
        const preview = await getMediaStream(video);
        localStreamRef.current = preview;
        setCameraOff(preview.getVideoTracks().length === 0);

        const result = await api.startCall({ thread_id: threadId, video, audio: true });
        iceServersRef.current = result.ice_servers || iceServersRef.current;
        callIdRef.current = result.call.id;
        setActiveCallSafe(result.call);
        setPhaseSafe("outgoing");
        setMuted(false);
        await ensurePeer(result.call, result.ice_servers);
        startPolling(result.call, true, 800);
      } catch (err) {
        cleanupMedia();
        setPhaseSafe("idle");
        setActiveCallSafe(null);
        reportError(err, "Could not start call.");
      } finally {
        setBusyAction(false);
      }
    },
    [cleanupMedia, ensurePeer, reportError, setActiveCallSafe, setPhaseSafe, startPolling],
  );

  const acceptIncoming = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call?.id) {
      reportError(new Error("No incoming call to accept."), "No incoming call to accept.");
      return;
    }
    if (busyAction || acceptingRef.current) return;

    try {
      setBusyAction(true);
      acceptingRef.current = true;
      setPhaseSafe("connecting");

      await ensurePeer(call, iceServersRef.current);

      const result = await api.callAction(call.id, "accept");
      const next = result.call || { ...call, status: "accepted" as const };
      callIdRef.current = next.id;
      setActiveCallSafe(next);
      setCameraOff(!next.media.video || !localStreamRef.current?.getVideoTracks().length);
      if (result.ice_servers?.length) iceServersRef.current = result.ice_servers;
      startPolling(next, false, 500);
      acceptingRef.current = false;
      // Kick an immediate sync so we can answer the offer ASAP.
      void applySignals(next, false).catch(() => undefined);
    } catch (err) {
      acceptingRef.current = false;
      if (activeCallRef.current?.status === "ringing") {
        setPhaseSafe("incoming");
      }
      reportError(err, "Could not accept call. Check microphone permission and try again.");
    } finally {
      setBusyAction(false);
    }
  }, [
    applySignals,
    busyAction,
    ensurePeer,
    reportError,
    setActiveCallSafe,
    setPhaseSafe,
    startPolling,
  ]);

  const rejectIncoming = useCallback(async () => {
    const callId = callIdRef.current || activeCallRef.current?.id;
    try {
      if (callId) await api.callAction(callId, "reject");
    } catch {
      // ignore
    }
    cleanupMedia();
    setActiveCallSafe(null);
    setPhaseSafe("idle");
  }, [cleanupMedia, setActiveCallSafe, setPhaseSafe]);

  const hangup = useCallback(async () => {
    const callId = callIdRef.current || activeCallRef.current?.id;
    cleanupMedia();
    setPhaseSafe("idle");
    setActiveCallSafe(null);
    setElapsedSec(0);
    if (callId) {
      try {
        await api.callAction(callId, "hangup");
      } catch {
        // ignore
      }
    }
  }, [cleanupMedia, setActiveCallSafe, setPhaseSafe]);

  const attachIncoming = useCallback(
    (call: InternalCallSession, iceServers?: RTCIceServer[]) => {
      if (phaseRef.current !== "idle" && phaseRef.current !== "incoming") return;
      if (iceServers?.length) iceServersRef.current = iceServers;
      callIdRef.current = call.id;
      setActiveCallSafe(call);
      setPhaseSafe("incoming");
      setCameraOff(!call.media.video);
      startPolling(call, false, 1000);
    },
    [setActiveCallSafe, setPhaseSafe, startPolling],
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
  }, [muted]);

  const toggleCamera = useCallback(() => {
    if (!activeCallRef.current?.media.video) return;
    const next = !cameraOff;
    setCameraOff(next);
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
  }, [cameraOff]);

  useEffect(() => {
    attachLocalVideo();
  }, [attachLocalVideo, phase]);

  useEffect(() => {
    attachRemoteVideo();
  }, [attachRemoteVideo, phase]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  return {
    phase,
    activeCall,
    muted,
    cameraOff,
    elapsedSec,
    busyAction,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptIncoming,
    rejectIncoming,
    hangup,
    attachIncoming,
    toggleMute,
    toggleCamera,
  };
}
