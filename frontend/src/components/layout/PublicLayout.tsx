import { Link } from "react-router-dom";
import { Logo } from "../ui/Logo";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-ink-50/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center">
          <Logo variant="mark" />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link to="/#discover" className="text-ink-600 hover:text-brand-600">
            Discover
          </Link>
          <Link to="/about" className="text-ink-600 hover:text-brand-600">
            About
          </Link>
          <Link to="/admin/register" className="btn-secondary py-2 text-xs">
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo variant="mark" className="h-10 w-auto max-w-[220px]" />
          <p className="text-center text-xs text-ink-400 sm:text-right">
            Build Your Legacy. Showcase Your Impact.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-ink-400 sm:text-left">
          UXGuard Studio isn&apos;t just another portfolio platform—it&apos;s your professional operating
          system.
        </p>
      </div>
    </footer>
  );
}
