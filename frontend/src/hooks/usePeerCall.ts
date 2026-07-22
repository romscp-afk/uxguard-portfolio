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

export function usePeerCall({ selfId, onError }: UsePeerCallOptions) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [activeCall, setActiveCall] = useState<InternalCallSession | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  const signalVersionRef = useRef(0);
  const appliedCandidatesRef = useRef(new Set<string>());
  const offerSentRef = useRef(false);
  const answerSentRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]);

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
    signalVersionRef.current = 0;
    appliedCandidatesRef.current.clear();
    offerSentRef.current = false;
    answerSentRef.current = false;
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

  const ensurePeer = useCallback(
    async (call: InternalCallSession, iceServers?: RTCIceServer[]) => {
      if (iceServers?.length) iceServersRef.current = iceServers;
      callIdRef.current = call.id;
      if (pcRef.current) {
        attachLocalVideo();
        return pcRef.current;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: Boolean(call.media.video),
      });
      localStreamRef.current = stream;
      attachLocalVideo();

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcRef.current = pc;
      remoteStreamRef.current = new MediaStream();

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      pc.ontrack = (event) => {
        const inbound = event.streams[0];
        if (inbound) {
          remoteStreamRef.current = inbound;
        } else if (event.track) {
          remoteStreamRef.current?.addTrack(event.track);
        }
        attachRemoteVideo();
      };

      pc.onicecandidate = (event) => {
        const id = callIdRef.current;
        if (!event.candidate || !id) return;
        void api
          .callAction(id, "signal", { candidate: event.candidate.toJSON() })
          .catch(() => undefined);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setPhase("connected");
          const id = callIdRef.current;
          if (id) void api.callAction(id, "connected").catch(() => undefined);
          if (!timerRef.current) {
            setElapsedSec(0);
            timerRef.current = window.setInterval(() => {
              setElapsedSec((value) => value + 1);
            }, 1000);
          }
        }
      };

      return pc;
    },
    [attachLocalVideo, attachRemoteVideo],
  );

  const applySignals = useCallback(
    async (call: InternalCallSession, isCaller: boolean) => {
      const snapshot = await api.getCall(call.id, signalVersionRef.current);
      if (snapshot.ice_servers?.length) iceServersRef.current = snapshot.ice_servers;
      setActiveCall(snapshot.call);

      if (["ended", "rejected", "missed", "failed"].includes(snapshot.call.status)) {
        setPhase("ended");
        cleanupMedia();
        window.setTimeout(() => {
          setPhase("idle");
          setActiveCall(null);
        }, 1200);
        return snapshot.call;
      }

      if (snapshot.call.status === "accepted" || snapshot.call.status === "connected") {
        setPhase((prev) => (prev === "connected" ? prev : "connecting"));
      }

      const needsMedia =
        isCaller ||
        snapshot.call.status === "accepted" ||
        snapshot.call.status === "connected";
      if (!needsMedia) return snapshot.call;

      const pc = await ensurePeer(snapshot.call, snapshot.ice_servers);
      const { signal } = snapshot;
      signalVersionRef.current = Math.max(signalVersionRef.current, signal.version || 0);

      if (
        isCaller &&
        snapshot.call.status === "accepted" &&
        !offerSentRef.current &&
        !pc.localDescription
      ) {
        offerSentRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await api.callAction(call.id, "signal", {
          offer: { type: offer.type, sdp: offer.sdp },
        });
      }

      if (!isCaller && signal.offer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription({ type: signal.offer.type, sdp: signal.offer.sdp });
        if (!answerSentRef.current) {
          answerSentRef.current = true;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await api.callAction(call.id, "signal", {
            answer: { type: answer.type, sdp: answer.sdp },
          });
        }
      }

      if (isCaller && signal.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription({ type: signal.answer.type, sdp: signal.answer.sdp });
      }

      for (const item of signal.ice || []) {
        if (Number(item.from_user_id) === Number(selfId)) continue;
        if (appliedCandidatesRef.current.has(item.id)) continue;
        appliedCandidatesRef.current.add(item.id);
        try {
          await pc.addIceCandidate(item.candidate);
        } catch {
          // ignore stale candidates
        }
      }

      return snapshot.call;
    },
    [cleanupMedia, ensurePeer, selfId],
  );

  const startPolling = useCallback(
    (call: InternalCallSession, isCaller: boolean) => {
      stopPolling();
      const tick = () => {
        void applySignals(call, isCaller).catch((err) => reportError(err, "Call sync failed."));
      };
      tick();
      pollRef.current = window.setInterval(tick, 1200);
    },
    [applySignals, reportError, stopPolling],
  );

  const startCall = useCallback(
    async (threadId: string, video: boolean) => {
      try {
        cleanupMedia();
        const result = await api.startCall({ thread_id: threadId, video, audio: true });
        iceServersRef.current = result.ice_servers || iceServersRef.current;
        callIdRef.current = result.call.id;
        setActiveCall(result.call);
        setPhase("outgoing");
        setCameraOff(!video);
        setMuted(false);
        await ensurePeer(result.call, result.ice_servers);
        startPolling(result.call, true);
      } catch (err) {
        cleanupMedia();
        setPhase("idle");
        reportError(err, "Could not start call.");
      }
    },
    [cleanupMedia, ensurePeer, reportError, startPolling],
  );

  const acceptIncoming = useCallback(async () => {
    if (!activeCall) return;
    try {
      const result = await api.callAction(activeCall.id, "accept");
      const call = result.call || activeCall;
      callIdRef.current = call.id;
      setActiveCall(call);
      setPhase("connecting");
      setCameraOff(!call.media.video);
      await ensurePeer(call, result.ice_servers);
      startPolling(call, false);
    } catch (err) {
      reportError(err, "Could not accept call.");
    }
  }, [activeCall, ensurePeer, reportError, startPolling]);

  const rejectIncoming = useCallback(async () => {
    if (!activeCall) return;
    try {
      await api.callAction(activeCall.id, "reject");
    } catch {
      // ignore
    }
    cleanupMedia();
    setActiveCall(null);
    setPhase("idle");
  }, [activeCall, cleanupMedia]);

  const hangup = useCallback(async () => {
    const callId = callIdRef.current || activeCall?.id;
    cleanupMedia();
    setPhase("idle");
    setActiveCall(null);
    setElapsedSec(0);
    if (callId) {
      try {
        await api.callAction(callId, "hangup");
      } catch {
        // ignore
      }
    }
  }, [activeCall?.id, cleanupMedia]);

  const attachIncoming = useCallback((call: InternalCallSession, iceServers?: RTCIceServer[]) => {
    if (iceServers?.length) iceServersRef.current = iceServers;
    callIdRef.current = call.id;
    setActiveCall(call);
    setPhase("incoming");
    setCameraOff(!call.media.video);
    startPolling(call, false);
  }, [startPolling]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
  }, [muted]);

  const toggleCamera = useCallback(() => {
    if (!activeCall?.media.video) return;
    const next = !cameraOff;
    setCameraOff(next);
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
  }, [activeCall?.media.video, cameraOff]);

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
