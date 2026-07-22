import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  History,
  Image,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  MessageCircle,
  Menu,
  Palette,
  PlusCircle,
  Search,
  Sparkles,
  UserCircle,
  Users,
  X,
  FlaskConical,
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { NotificationBell } from "../community/NotificationBell";
import { AssistantFab, AssistantPanel } from "../assistant/AssistantPanel";
import { AssistantProvider } from "../../context/AssistantContext";
import { useAuth } from "../../context/AuthContext";
import { dashboardLinksForUser, isAdmin } from "../../lib/roles";

const ICONS: Record<string, typeof LayoutDashboard> = {
  profile: UserCircle,
  billing: CreditCard,
  projects: FolderKanban,
  ai: Sparkles,
  templates: LayoutTemplate,
  portfolio: Palette,
  "case-studies": FileText,
  media: Image,
  notifications: Bell,
  contact: Mail,
  messages: MessageCircle,
  users: Users,
  employers: Building2,
  resume: FileText,
  timeline: History,
  jobs: Search,
  applications: ClipboardList,
  saved: Bookmark,
  employer: Building2,
  "post-job": PlusCircle,
  achievements: Briefcase,
  analytics: BarChart3,
  testlab: FlaskConical,
};

function linkIsActive(pathname: string, to: string) {
  if (pathname === to) return true;
  // Avoid "/admin/employer" matching every employer child incorrectly for "Post a Job"
  if (to === "/admin/employer") {
    return pathname === "/admin/employer";
  }
  if (to === "/admin/employer/jobs/new") {
    return pathname === "/admin/employer/jobs/new" || pathname.startsWith("/admin/employer/jobs/");
  }
  if (to === "/admin/jobs") {
    return pathname === "/admin/jobs" || /^\/admin\/jobs\/\d+/.test(pathname);
  }
  return pathname.startsWith(`${to}/`);
}

export function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    const wantsEmployer = location.pathname.startsWith("/admin/employer");
    return (
      <Navigate
        to={wantsEmployer ? "/admin/employer/login" : "/admin/login"}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  const { groups, phase2, workspace } = dashboardLinksForUser(user);
  const isEmployerPortal = workspace === "employer";
  const displayName = user.name || user.email || "Account";

  // Employer session → stay in hiring portal (not candidate profile pages)
  if (
    isEmployerPortal &&
    !location.pathname.startsWith("/admin/employer") &&
    !location.pathname.startsWith("/admin/messages") &&
    !location.pathname.startsWith("/admin/billing") &&
    !location.pathname.startsWith("/admin/notifications") &&
    !location.pathname.startsWith("/admin/upgrade") &&
    !location.pathname.startsWith("/checkout")
  ) {
    return <Navigate to="/admin/employer" replace />;
  }

  // Candidate / admin session cannot open employer routes
  if (
    !isEmployerPortal &&
    location.pathname.startsWith("/admin/employer") &&
    !location.pathname.startsWith("/admin/employer/login") &&
    !location.pathname.startsWith("/admin/employer/register")
  ) {
    // Super admins go to the platform dashboard, not employer login
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/admin/employer/login" replace />;
  }

  // TestLab is admin-only while in private testing
  if (location.pathname.startsWith("/admin/testlab") && !isAdmin(user)) {
    return <Navigate to="/admin" replace />;
  }

  const dashboardTo = isEmployerPortal ? "/admin/employer" : "/admin";

  const navLinks = (
    <>
      <div>
        <Link
          to={dashboardTo}
          className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            location.pathname === dashboardTo
              ? "bg-brand-600 text-white"
              : "text-ink-300 hover:bg-ink-800 hover:text-white"
          }`}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Dashboard
        </Link>
      </div>

      {groups.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.links.map(({ to, label, section }) => {
              const Icon = ICONS[section] || Briefcase;
              const active = linkIsActive(location.pathname, to);
              return (
                <Link
                  key={`${group.id}-${to}`}
                  to={to}
                  className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-brand-600 text-white"
                      : "text-ink-300 hover:bg-ink-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {phase2.length > 0 ? (
        <div>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Coming soon
          </p>
          <div className="space-y-0.5">
            {phase2.map(({ label, section }) => {
              const Icon = ICONS[section] || Briefcase;
              return (
                <div
                  key={label}
                  className="flex min-h-10 cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-600"
                  title="Coming soon"
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-50" />
                  <span className="truncate opacity-70">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );

  const accountFooter = (
    <div className="border-t border-ink-800 p-4">
      <div className="mb-3 px-2">
        <p className="truncate text-sm font-medium">{displayName}</p>
        {user.email && user.email !== displayName ? (
          <p className="truncate text-xs text-ink-400">{user.email}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        {!isEmployerPortal && user.portfolio_url ? (
          <a
            href={user.portfolio_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex-1 py-2 text-xs"
          >
            My Portfolio
          </a>
        ) : (
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex-1 py-2 text-xs"
          >
            View Site
          </a>
        )}
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center justify-center rounded-lg border border-ink-700 px-3 py-2 text-ink-300 transition hover:bg-ink-800 hover:text-white"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <AssistantProvider>
      <div className="min-h-screen bg-ink-100">
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-ink-800 bg-ink-950 px-3 text-white lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-200 hover:bg-ink-800 hover:text-white"
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
            aria-controls="portal-mobile-nav"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              <span className="text-brand-400">UX</span>Guard Studio
            </p>
            <p className="truncate text-[10px] uppercase tracking-wider text-ink-400">
              {displayName}
            </p>
          </div>
          <NotificationBell />
        </header>

        <div
          className={`fixed inset-0 z-40 bg-ink-950/55 transition-opacity duration-200 lg:hidden ${
            mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!mobileNavOpen}
          onClick={() => setMobileNavOpen(false)}
        />

        <aside
          id="portal-mobile-nav"
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col bg-ink-950 text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-hidden={!mobileNavOpen}
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink-800 px-4 py-3">
            <div className="min-w-0">
              <Logo variant="mark" theme="dark" />
              <p className="mt-1 truncate text-xs text-ink-300">{displayName}</p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-ink-800 hover:text-white"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">{navLinks}</nav>
          {accountFooter}
        </aside>

        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-800 bg-ink-950 text-white lg:flex">
          <div className="border-b border-ink-800 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <Logo variant="mark" theme="dark" />
              <NotificationBell />
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-400">
              {isEmployerPortal ? "Employer portal" : "Platform portal"}
            </p>
            <p className="mt-1 truncate text-xs text-ink-200">{displayName}</p>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto p-3">{navLinks}</nav>
          {accountFooter}
        </aside>

        <main className="min-w-0 px-4 pb-24 pt-[4.25rem] sm:px-6 lg:ml-64 lg:px-8 lg:pb-8 lg:pt-8">
          <Outlet />
        </main>

        <AssistantPanel />
        <AssistantFab />
      </div>
    </AssistantProvider>
  );
}
