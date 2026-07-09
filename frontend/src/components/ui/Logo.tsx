type LogoProps = {
  className?: string;
  /** mark = shield + wordmark (default), icon = shield only, image = full raster (only if you upload a clean logo.png) */
  variant?: "mark" | "icon" | "image";
  theme?: "light" | "dark";
};

function Wordmark({ theme, showTagline }: { theme: "light" | "dark"; showTagline?: boolean }) {
  const guardClass = theme === "dark" ? "text-white" : "text-ink-950";

  return (
    <div className="min-w-0">
      <p className="font-sans text-[1.35rem] font-bold leading-none tracking-tight sm:text-[1.5rem]">
        <span className="text-brand-500">UX</span>
        <span className={guardClass}>Guard</span>
      </p>
      <div
        className={`mt-1.5 flex items-center gap-2 text-[0.55rem] font-semibold uppercase tracking-[0.32em] sm:text-[0.6rem] ${
          theme === "dark" ? "text-ink-300" : "text-brand-600/80"
        }`}
      >
        <span className={`h-px w-3 ${theme === "dark" ? "bg-ink-500" : "bg-brand-500/40"}`} />
        Studio
        <span className={`h-px w-3 ${theme === "dark" ? "bg-ink-500" : "bg-brand-500/40"}`} />
      </div>
      {showTagline ? (
        <p
          className={`mt-2 text-[0.5rem] font-medium uppercase tracking-[0.22em] ${
            theme === "dark" ? "text-ink-400" : "text-ink-500"
          }`}
        >
          Portfolio Management System
        </p>
      ) : null}
    </div>
  );
}

export function Logo({ className = "", variant = "mark", theme = "light" }: LogoProps) {
  if (variant === "image") {
    return (
      <img
        src="/logo.png"
        alt="UXGuard Studio"
        className={`h-11 w-auto max-w-[260px] object-contain object-left ${className}`}
        decoding="async"
      />
    );
  }

  if (variant === "icon") {
    return (
      <img
        src="/logo-icon.png"
        srcSet="/logo-icon.png 1x, /logo-icon@2x.png 2x"
        alt="UXGuard Studio"
        className={`h-10 w-10 object-contain ${className}`}
        decoding="async"
      />
    );
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      <img
        src="/logo-icon.png"
        srcSet="/logo-icon.png 1x, /logo-icon@2x.png 2x"
        alt=""
        aria-hidden
        className="h-10 w-auto shrink-0 object-contain sm:h-11"
        decoding="async"
      />
      <Wordmark theme={theme} />
    </div>
  );
}
