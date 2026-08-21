type LogoProps = {
  className?: string;
  /** mark = full wordmark lockup, icon = shield only, image = same as mark */
  variant?: "mark" | "icon" | "image";
  theme?: "light" | "dark";
};

export function Logo({ className = "", variant = "mark", theme: _theme = "light" }: LogoProps) {
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
    <img
      src="/logo.png"
      alt="UXGuard Studio"
      className={`h-9 w-auto max-w-[220px] object-contain object-left sm:h-10 sm:max-w-[260px] ${className}`}
      decoding="async"
    />
  );
}
