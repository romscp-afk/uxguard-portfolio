import { useState } from "react";
import { Check, Copy, Linkedin, Share2, Twitter } from "lucide-react";

type ShareBarProps = {
  title: string;
  url?: string;
  summary?: string;
};

function absoluteUrl(pathOrUrl?: string) {
  if (!pathOrUrl) {
    return typeof window !== "undefined" ? window.location.href : "";
  }
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function ShareBar({ title, url, summary }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = absoluteUrl(url);
  const text = summary?.trim() || title;

  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${title}${summary ? ` — ${summary}` : ""}`)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title, text, url: shareUrl });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-ink-400">Share</span>
      <a
        href={linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-[#0A66C2] hover:text-[#0A66C2]"
      >
        <Linkedin className="h-4 w-4" />
        LinkedIn
      </a>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-900 hover:text-ink-950"
      >
        <Twitter className="h-4 w-4" />
        X / Twitter
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      {typeof navigator !== "undefined" && "share" in navigator ? (
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
        >
          <Share2 className="h-4 w-4" />
          More
        </button>
      ) : null}
    </div>
  );
}
