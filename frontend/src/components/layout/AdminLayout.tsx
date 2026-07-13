import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Briefcase,
  FileText,
  FolderKanban,
  Image,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Palette,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { NotificationBell } from "../community/NotificationBell";
import { AssistantFab, AssistantPanel } from "../assistant/AssistantPanel";
import { AssistantProvider } from "../../context/AssistantContext";
import { useAuth } from "../../context/AuthContext";
import { dashboardLinksForUser, normalizeRole } from "../../lib/roles";

const ICONS: Record<string, typeof LayoutDashboard> = {
  profile: UserCircle,
  projects: FolderKanban,
  ai: Sparkles,
  templates: LayoutTemplate,
  portfolio: Palette,
  "case-studies": FileText,
  media: Image,
  notifications: Bell,
  contact: Mail,
  resume: Briefcase,
  timeline: Briefcase,
  achievements: Briefcase,
  analytics: BarChart3,
};

export function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

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

  const { primary, phase2 } = dashboardLinksForUser(user);
  const roleLabel = normalizeRole(user.role);

  return (
    <AssistantProvider>
      <div className="flex min-h-screen bg-ink-100">
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-ink-800 bg-ink-950 text-white">
        <div className="border-b border-ink-800 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Logo variant="mark" theme="dark" />
            <NotificationBell />
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-400">Platform Portal</p>
          <p className="mt-1 text-xs text-brand-300 capitalize">{roleLabel} account</p>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          <div>
            <Link
              to="/admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                location.pathname === "/admin"
                  ? "bg-brand-600 text-white"
                  : "text-ink-300 hover:bg-ink-800 hover:text-white"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </div>

          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Platform
            </p>
            <div className="space-y-1">
              {primary.map(({ to, label, section }) => {
                const Icon = ICONS[section] || Briefcase;
                const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-brand-600 text-white"
                        : "text-ink-300 hover:bg-ink-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Coming in Phase 2
            </p>
            <div className="space-y-1">
              {phase2.map(({ label, section }) => {
                const Icon = ICONS[section] || Briefcase;
                return (
                  <div
                    key={label}
                    className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600"
                    title="Coming soon"
                  >
                    <Icon className="h-4 w-4 opacity-50" />
                    <span className="opacity-70">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="border-t border-ink-800 p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-ink-400">{user.email}</p>
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
      </aside>

      <main className="ml-64 flex-1 p-8">
        <Outlet />
      </main>

      <AssistantPanel />
      <AssistantFab />
    </div>
    </AssistantProvider>
  );
}
