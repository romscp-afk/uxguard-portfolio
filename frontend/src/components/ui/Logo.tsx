type LogoProps = {
  className?: string;
};

export function Logo({ className = "h-auto w-[200px]" }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="UXGuard Studio — Portfolio Management System"
      width={200}
      className={`object-contain object-left ${className}`}
    />
  );
}
