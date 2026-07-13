export const NOTIFICATIONS_UPDATED_EVENT = "uxguard:notifications-updated";

export function emitNotificationsUpdated(unreadCount?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { unread_count: unreadCount },
    }),
  );
}
