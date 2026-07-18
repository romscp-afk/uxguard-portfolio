import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "../ui/Logo";
import { NotificationBell } from "../community/NotificationBell";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PORTFOLIO_SETTINGS } from "../../lib/defaultSettings";

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
          <NavLink to="/">Home</NavLink>
          <NavLink to="/discover">Discover</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
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
              <Link
                to="/admin/employer/register"
                className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                Employers
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
                { to: "/", label: "Home" },
                { to: "/discover", label: "Discover" },
                { to: "/pricing", label: "Pricing" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-ink-800 transition hover:bg-brand-50 hover:text-brand-700"
                  >
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
                    Join as a professional
                  </Link>
                  <Link
                    to="/admin/employer/register"
                    onClick={close}
                    className="btn-secondary flex w-full justify-center py-3"
                  >
                    Create employer account
                  </Link>
                  <Link
                    to="/admin/login"
                    onClick={close}
                    className="flex w-full justify-center py-3 text-sm font-medium text-ink-600"
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
  const [email, setEmail] = useState("");
  const [newsletterNote, setNewsletterNote] = useState("");
  const contactEmail = DEFAULT_PORTFOLIO_SETTINGS.contact_email;
  const linkedin = DEFAULT_PORTFOLIO_SETTINGS.social_links.linkedin;

  function onNewsletter(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setNewsletterNote("Thanks — we'll be in touch.");
    setEmail("");
  }

  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo variant="mark" theme="light" className="h-10 w-auto max-w-[220px]" />
            <p className="mt-4 max-w-sm text-sm text-ink-500">
              Portfolios for professionals. Hiring tools for employers — after company verification.
            </p>
            <p className="mt-4 text-sm">
              <a href={`mailto:${contactEmail}`} className="font-medium text-brand-600 hover:text-brand-500">
                {contactEmail}
              </a>
            </p>
            {linkedin ? (
              <a
                href={linkedin}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-medium text-ink-600 hover:text-brand-600"
              >
                LinkedIn
              </a>
            ) : null}
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Product</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li>
                  <Link to="/discover" className="hover:text-brand-600">
                    Discover
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-brand-600">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/pricing#faq" className="hover:text-brand-600">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/admin/register" className="hover:text-brand-600">
                    Professional signup
                  </Link>
                </li>
                <li>
                  <Link to="/admin/employer/register" className="hover:text-brand-600">
                    Employer signup
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-brand-600">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Company</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-600">
                <li>
                  <Link to="/about" className="hover:text-brand-600">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-brand-600">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-brand-600">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-brand-600">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Newsletter</p>
            <p className="mt-3 text-sm text-ink-500">Product updates and tips for impactful case studies.</p>
            <form onSubmit={onNewsletter} className="mt-4 flex flex-col gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="input-field"
                aria-label="Email for newsletter"
              />
              <button type="submit" className="btn-primary">
                Subscribe
              </button>
            </form>
            {newsletterNote ? <p className="mt-2 text-xs text-brand-700">{newsletterNote}</p> : null}
          </div>
        </div>

        <div className="mt-10 border-t border-ink-100 pt-6 text-center text-xs text-ink-400 sm:text-left">
          © {new Date().getFullYear()} UXGuard Studio
        </div>
      </div>
    </footer>
  );
}
