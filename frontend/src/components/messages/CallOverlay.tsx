import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import type { RefObject } from "react";
import type { InternalCallSession } from "../../types";

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type CallOverlayProps = {
  phase: "idle" | "outgoing" | "incoming" | "connecting" | "connected" | "ended";
  call: InternalCallSession | null;
  selfId?: number;
  muted: boolean;
  cameraOff: boolean;
  elapsedSec: number;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
};

export function CallOverlay({
  phase,
  call,
  selfId,
  muted,
  cameraOff,
  elapsedSec,
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onReject,
  onHangup,
  onToggleMute,
  onToggleCamera,
}: CallOverlayProps) {
  if (phase === "idle" || !call) return null;

  const isCaller = Number(call.caller_user_id) === Number(selfId);
  const other = isCaller ? call.callee : call.caller;
  const title = other?.name || other?.email || "UXGuard member";
  const videoEnabled = Boolean(call.media.video);
  const statusLabel =
    phase === "incoming"
      ? videoEnabled
        ? "Incoming video call"
        : "Incoming voice call"
      : phase === "outgoing"
        ? "Calling…"
        : phase === "connecting"
          ? "Connecting…"
          : phase === "connected"
            ? formatElapsed(elapsedSec)
            : "Call ended";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-ink-800 bg-ink-950 text-white shadow-2xl">
        <div className="relative aspect-video bg-ink-900">
          <video
            ref={remoteVideoRef as RefObject<HTMLVideoElement>}
            className={`h-full w-full object-cover ${videoEnabled ? "" : "opacity-0"}`}
            autoPlay
            playsInline
          />
          {videoEnabled ? (
            <video
              ref={localVideoRef as RefObject<HTMLVideoElement>}
              className="absolute bottom-4 right-4 h-28 w-40 rounded-xl border border-white/20 object-cover shadow-lg"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-500/20 text-3xl font-semibold text-brand-300">
                {(title || "?").slice(0, 1).toUpperCase()}
              </div>
              <p className="text-sm text-white/70">Voice call</p>
            </div>
          )}
          {!videoEnabled ? (
            <video
              ref={localVideoRef as RefObject<HTMLVideoElement>}
              className="hidden"
              autoPlay
              muted
              playsInline
            />
          ) : null}
          <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm">
            {title} · {statusLabel}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-5">
          {phase === "incoming" ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-400"
                onClick={onAccept}
              >
                <Phone className="h-4 w-4" />
                Accept
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-400"
                onClick={onReject}
              >
                <PhoneOff className="h-4 w-4" />
                Decline
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                onClick={onToggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              {videoEnabled ? (
                <button
                  type="button"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                  onClick={onToggleCamera}
                  aria-label={cameraOff ? "Camera on" : "Camera off"}
                >
                  {cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-400"
                onClick={onHangup}
              >
                <PhoneOff className="h-4 w-4" />
                End
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
