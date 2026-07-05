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
          <Link to="/#about" className="text-ink-600 hover:text-brand-600">
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
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
        <Logo variant="mark" className="h-10 w-auto max-w-[220px]" />
        <p className="text-xs text-ink-400">Built for UX researchers to showcase evidence-driven work.</p>
      </div>
    </footer>
  );
}
