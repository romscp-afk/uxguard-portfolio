import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { api } from "../../api/client";
import { emitNotificationsUpdated } from "../../lib/notifications";
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
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await api.getNotifications();
      setNotifications(result.notifications);
      setUnread(result.unread_count);
      emitNotificationsUpdated(result.unread_count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markAllRead() {
    setMarking(true);
    try {
      const result = await api.markNotificationsRead();
      setUnread(result.unread_count);
      emitNotificationsUpdated(result.unread_count);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
      );
    } finally {
      setMarking(false);
    }
  }

  async function openNotification(notification: Notification) {
    setOpeningId(notification.id);
    try {
      if (!notification.read_at) {
        const result = await api.markNotificationsRead([notification.id]);
        setUnread(result.unread_count);
        emitNotificationsUpdated(result.unread_count);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, read_at: n.read_at || new Date().toISOString() }
              : n,
          ),
        );
      }
      if (notification.link) {
        navigate(notification.link);
      }
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Notifications</h1>
          <p className="mt-1 text-ink-500">
            Community alerts, contact inbox mail, and account activity.
          </p>
        </div>
        {unread > 0 ? (
          <button type="button" onClick={() => void markAllRead()} disabled={marking} className="btn-secondary">
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
            New contact emails and community activity will show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                disabled={openingId === notification.id}
                onClick={() => void openNotification(notification)}
                className={`card w-full p-5 text-left transition hover:border-brand-300 ${
                  notification.read_at ? "opacity-80" : "border-brand-200 bg-brand-50/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      notification.read_at ? "bg-ink-200" : "bg-brand-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink-900">{notification.title}</p>
                      {openingId === notification.id ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-ink-600">{notification.message}</p>
                    <p className="mt-2 text-xs text-ink-400">
                      {formatWhen(notification.created_at)}
                      {notification.link ? (
                        <span className="ml-2 text-brand-600">
                          Open {notification.link.startsWith("/admin/contact") ? "inbox" : "link"}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-ink-400">
        Tip: open{" "}
        <Link to="/admin/contact-inbox" className="font-medium text-brand-600 hover:text-brand-700">
          Mail
        </Link>{" "}
        to reply to contact form messages.
      </p>
    </div>
  );
}
