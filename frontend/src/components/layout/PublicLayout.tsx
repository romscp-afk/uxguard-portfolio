import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "../ui/Logo";
import { NotificationBell } from "../community/NotificationBell";
import { useAuth } from "../../context/AuthContext";

function NavLink({
  to,
  children,
  onClick,
  className = "",
}: {
  to: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`text-ink-600 transition hover:text-brand-600 ${className}`}
    >
      {children}
    </Link>
  );
}

export function PublicHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100/80 bg-ink-50/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 sm:py-4">
        <Link to="/" className="flex shrink-0 items-center" onClick={close}>
          <Logo variant="mark" theme="light" />
        </Link>

        <nav className="hidden items-center gap-3 text-sm font-medium md:flex">
          <NavLink to="/search" className="inline-flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            Search
          </NavLink>
          <NavLink to="/#discover">Discover</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          {user ? (
            <>
              <NotificationBell />
              <Link to="/admin" className="btn-secondary py-2 text-xs">
                Portal
              </Link>
            </>
          ) : (
            <>
              <NavLink to="/admin/login">Sign in</NavLink>
              <Link to="/admin/register" className="btn-secondary py-2 text-xs">
                Sign up
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          {user ? <NotificationBell /> : null}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-700 shadow-sm transition hover:border-brand-400 hover:text-brand-600"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 top-[57px] z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={close}
          />
          <nav className="relative max-h-[calc(100vh-57px)] overflow-y-auto border-b border-ink-100 bg-white px-4 py-5 shadow-xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-400">Menu</p>
            <ul className="space-y-1">
              {[
                { to: "/search", label: "Search", icon: Search },
                { to: "/#discover", label: "Discover" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
              ].map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-ink-800 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    {Icon ? <Icon className="h-5 w-5 text-brand-600" /> : null}
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2 border-t border-ink-100 pt-6">
              {user ? (
                <Link to="/admin" onClick={close} className="btn-primary flex w-full justify-center py-3">
                  Open Portal
                </Link>
              ) : (
                <>
                  <Link
                    to="/admin/register"
                    onClick={close}
                    className="btn-primary flex w-full justify-center py-3"
                  >
                    Start Your Journey
                  </Link>
                  <Link
                    to="/admin/login"
                    onClick={close}
                    className="btn-secondary flex w-full justify-center py-3"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <p className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-center text-xs font-medium text-brand-800">
              Build · Showcase · Measure · Grow
            </p>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo variant="mark" theme="light" className="h-10 w-auto max-w-[220px]" />
          <p className="text-center text-xs text-ink-400 sm:text-right">
            Build Your Legacy. Showcase Your Impact.
          </p>
        </div>
        <div className="mt-4 flex flex-col items-center justify-between gap-2 text-xs text-ink-400 sm:flex-row">
          <p className="text-center sm:text-left">
            UXGuard Studio — your professional operating system.
          </p>
          <Link to="/contact" className="font-medium text-brand-600 hover:text-brand-500">
            Contact us
          </Link>
        </div>
      </div>
    </footer>
  );
}
