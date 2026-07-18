import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  Menu,
  Palette,
  PlusCircle,
  Search,
  Sparkles,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { NotificationBell } from "../community/NotificationBell";
import { AssistantFab, AssistantPanel } from "../assistant/AssistantPanel";
import { AssistantProvider } from "../../context/AssistantContext";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError } from "../../api/client";
import { dashboardLinksForUser, normalizeRole } from "../../lib/roles";

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
  users: Users,
  resume: FileText,
  timeline: History,
  jobs: Search,
  applications: ClipboardList,
  saved: Bookmark,
  employer: Building2,
  "post-job": PlusCircle,
  achievements: Briefcase,
  analytics: BarChart3,
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
  const { user, loading, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);

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
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  const { groups, phase2, workspace } = dashboardLinksForUser(user);
  const roleLabel = normalizeRole(user.role);

  async function switchWorkspace(next: "candidate" | "employer") {
    if (!user || next === workspace || workspaceBusy) return;
    setWorkspaceBusy(true);
    try {
      if (next === "employer" && !user.workspaces?.employer) {
        await api.enableEmployerWorkspace();
      } else {
        await api.setActiveWorkspace(next);
      }
      await refreshUser();
      navigate(next === "employer" ? "/admin/employer" : "/admin");
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err);
    } finally {
      setWorkspaceBusy(false);
    }
  }

  const workspaceSwitcher = (
    <div className="rounded-lg border border-ink-800 bg-ink-900/80 p-2">
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        Workspace
      </p>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          disabled={workspaceBusy}
          onClick={() => void switchWorkspace("candidate")}
          className={`rounded-md px-2 py-2 text-xs font-medium transition ${
            workspace === "candidate"
              ? "bg-brand-600 text-white"
              : "text-ink-300 hover:bg-ink-800 hover:text-white"
          }`}
        >
          Candidate
        </button>
        <button
          type="button"
          disabled={workspaceBusy}
          onClick={() => void switchWorkspace("employer")}
          className={`rounded-md px-2 py-2 text-xs font-medium transition ${
            workspace === "employer"
              ? "bg-brand-600 text-white"
              : "text-ink-300 hover:bg-ink-800 hover:text-white"
          }`}
        >
          Employer
        </button>
      </div>
    </div>
  );

  const navLinks = (
    <>
      {workspaceSwitcher}

      <div>
        <Link
          to="/admin"
          className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            location.pathname === "/admin"
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
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-ink-400">{user.email}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-500">
          {workspace} workspace
        </p>
      </div>
      <div className="flex gap-2">
        {user.portfolio_url ? (
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
              {workspace} · Portal
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
              <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-400">
                {roleLabel} account
              </p>
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
            <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-400">Platform Portal</p>
            <p className="mt-1 text-xs capitalize text-brand-300">{roleLabel} account</p>
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
