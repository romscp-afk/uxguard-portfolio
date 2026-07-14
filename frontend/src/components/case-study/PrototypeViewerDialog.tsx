import { useEffect, useId, useRef, useState } from "react";
import { EyeOff, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  url: string;
  title?: string;
  onClose: () => void;
};

/** Convert share links (e.g. Figma) into embed-friendly URLs when possible. */
export function toEmbeddablePrototypeUrl(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "figma.com" && !parsed.pathname.startsWith("/embed")) {
      return `https://www.figma.com/embed?embed_host=uxguard&url=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * View-only prototype popup.
 * Deterrents (right-click, save/print shortcuts, blur-on-hide, no download chrome)
 * raise the bar — they cannot stop OS-level screenshots.
 */
export function PrototypeViewerDialog({ open, url, title, onClose }: Props) {
  const titleId = useId();
  const embedUrl = toEmbeddablePrototypeUrl(url);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPaused(false);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const key = event.key.toLowerCase();
      const blocked =
        ((event.metaKey || event.ctrlKey) && ["s", "p", "u"].includes(key)) ||
        key === "printscreen" ||
        (event.metaKey && event.shiftKey && key === "3") ||
        (event.metaKey && event.shiftKey && key === "4");

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    function onVisibility() {
      setPaused(document.hidden);
    }

    function onWindowBlur() {
      setPaused(true);
    }

    function onWindowFocus() {
      if (!document.hidden) setPaused(false);
    }

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
  }, [open, embedUrl]);

  if (!open || !embedUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="flex h-[min(92vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate font-display text-lg font-semibold text-ink-950">
              {title || "Live prototype"}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              View only · saving, printing, and downloads are disabled in this viewer
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-200 text-ink-600 transition hover:border-ink-300 hover:bg-ink-50"
            aria-label="Close prototype viewer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative min-h-0 flex-1 select-none bg-ink-100"
          style={{ WebkitUserSelect: "none", userSelect: "none" }}
          onContextMenu={(event) => event.preventDefault()}
        >
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-ink-50 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading prototype…
            </div>
          ) : null}

          <iframe
            ref={iframeRef}
            key={embedUrl}
            title={title || "Prototype"}
            src={embedUrl}
            className="h-full w-full border-0 bg-white"
            // allow-scripts + allow-same-origin needed for interactive prototypes;
            // omit allow-downloads so the browser chrome can't expose a download path.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={() => setLoading(false)}
          />

          {/* Soft watermark grid — deters clean captures without blocking use */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-18deg, transparent, transparent 48px, #0f172a 48px, #0f172a 49px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 flex flex-wrap content-around justify-around gap-16 overflow-hidden p-8 opacity-[0.07]"
          >
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className="rotate-[-18deg] text-xs font-semibold uppercase tracking-[0.25em] text-ink-950"
              >
                UXGuard · view only
              </span>
            ))}
          </div>

          {paused ? (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-ink-950/85 px-6 text-center text-white backdrop-blur-sm">
              <EyeOff className="h-8 w-8 text-white/80" />
              <p className="font-display text-lg font-semibold">Preview paused</p>
              <p className="max-w-sm text-sm text-white/70">
                Return to this window to continue viewing the prototype.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 bg-ink-50 px-4 py-2.5 text-xs text-ink-500 sm:px-5">
          <span>
            Some sites block embedding. If the frame is blank, paste an embeddable Figma / Framer /
            prototype URL instead.
          </span>
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
