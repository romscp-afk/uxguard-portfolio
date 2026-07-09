import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export function NotificationBell() {
  const { user } = useAuth();
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

    load();
    const interval = window.setInterval(load, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  if (!user) return null;

  return (
    <Link
      to="/admin/notifications"
      className="relative inline-flex items-center justify-center rounded-lg border border-ink-200 bg-white p-2 text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
      aria-label="Notifications"
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
