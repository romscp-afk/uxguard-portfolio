import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { api } from "../../api/client";
import type { Notification } from "../../types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await api.getNotifications();
      setNotifications(result.notifications);
      setUnread(result.unread_count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    setMarking(true);
    try {
      const result = await api.markNotificationsRead();
      setUnread(result.unread_count);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
      );
    } finally {
      setMarking(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Notifications</h1>
          <p className="mt-1 text-ink-500">
            Community alerts for new case studies, comments, and activity.
          </p>
        </div>
        {unread > 0 ? (
          <button type="button" onClick={markAllRead} disabled={marking} className="btn-secondary">
            {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Mark all read
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="card h-40 animate-pulse bg-ink-100" />
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-4 text-ink-500">No notifications yet.</p>
          <p className="mt-2 text-sm text-ink-400">
            When members publish case studies, you&apos;ll see alerts here and receive email if configured.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const content = (
              <div className="flex items-start gap-4">
                <div
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    notification.read_at ? "bg-ink-200" : "bg-brand-500"
                  }`}
                />
                <div>
                  <p className="font-semibold text-ink-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-ink-600">{notification.message}</p>
                  <p className="mt-2 text-xs text-ink-400">{formatWhen(notification.created_at)}</p>
                </div>
              </div>
            );

            return (
              <li
                key={notification.id}
                className={`card p-5 ${notification.read_at ? "opacity-80" : "border-brand-200 bg-brand-50/20"}`}
              >
                {notification.link ? (
                  <Link to={notification.link} className="block hover:text-brand-700">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
