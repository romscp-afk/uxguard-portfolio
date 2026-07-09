import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { FileText, Image, LayoutDashboard, LogOut, Mail, UserCircle, Bell } from "lucide-react";
import { Logo } from "../ui/Logo";
import { NotificationBell } from "../community/NotificationBell";
import { useAuth } from "../../context/AuthContext";

const nav = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/case-studies", icon: FileText, label: "Case Studies" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/contact-inbox", icon: Mail, label: "Contact Inbox" },
  { to: "/admin/media", icon: Image, label: "Media Library" },
  { to: "/admin/profile", icon: UserCircle, label: "Profile & Link" },
];

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

  return (
    <div className="flex min-h-screen bg-ink-100">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-ink-800 bg-ink-950 text-white">
        <div className="border-b border-ink-800 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Logo variant="mark" theme="dark" />
            <NotificationBell />
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-400">CMS</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ to, icon: Icon, label, end }) => {
            const active = end ? location.pathname === to : location.pathname.startsWith(to);
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
        </nav>

        <div className="border-t border-ink-800 p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-ink-400">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {user.portfolio_url ? (
              <Link to={user.portfolio_url} className="btn-secondary flex-1 py-2 text-xs">
                My Portfolio
              </Link>
            ) : (
              <Link to="/" className="btn-secondary flex-1 py-2 text-xs">
                View Site
              </Link>
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
    </div>
  );
}
