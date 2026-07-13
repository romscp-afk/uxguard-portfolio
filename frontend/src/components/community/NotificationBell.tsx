import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { NOTIFICATIONS_UPDATED_EVENT } from "../../lib/notifications";

export function NotificationBell() {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const result = await api.getNotifications();
        if (!cancelled) setUnread(result.unread_count);
      } catch {
        if (!cancelled) setUnread(0);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 30000);

    function onUpdated(event: Event) {
      const detail = (event as CustomEvent<{ unread_count?: number }>).detail;
      if (typeof detail?.unread_count === "number") {
        setUnread(detail.unread_count);
        return;
      }
      void load();
    }

    function onFocus() {
      void load();
    }

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id, location.pathname]);

  if (!user) return null;

  return (
    <Link
      to="/admin/notifications"
      className="relative inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white p-2 text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
