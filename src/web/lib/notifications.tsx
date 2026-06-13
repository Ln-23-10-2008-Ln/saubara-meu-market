import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = "new_order" | "order_update" | "system" | "promo";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, string | number | boolean>;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const NOTIF_KEY = "smm_notifications";

function loadNotifications(): Notification[] {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistNotifications(notifs: Notification[]) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function pushNotification(notif: Omit<Notification, "id" | "createdAt" | "read">): Notification {
  const n: Notification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const existing = loadNotifications();
  // Keep max 200 notifications total
  const trimmed = [n, ...existing].slice(0, 200);
  persistNotifications(trimmed);
  return n;
}

export function markAsRead(notifId: string): void {
  const notifs = loadNotifications();
  persistNotifications(notifs.map((n) => n.id === notifId ? { ...n, read: true } : n));
}

export function markAllAsRead(userId: string): void {
  const notifs = loadNotifications();
  persistNotifications(notifs.map((n) => n.userId === userId ? { ...n, read: true } : n));
}

export function deleteNotification(notifId: string): void {
  const notifs = loadNotifications();
  persistNotifications(notifs.filter((n) => n.id !== notifId));
}

export function getUnreadCount(userId: string): number {
  return loadNotifications().filter((n) => n.userId === userId && !n.read).length;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  refresh: () => void;
  push: (notif: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

interface NotificationsProviderProps {
  children: ReactNode;
  userId: string | null;
  pollInterval?: number; // ms, default 3000
}

export function NotificationsProvider({ children, userId, pollInterval = 3000 }: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    const all = loadNotifications().filter((n) => n.userId === userId);
    setNotifications(all);
  }, [userId]);

  // Initial load + polling
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, pollInterval);
    return () => clearInterval(timer);
  }, [refresh, pollInterval]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const push = useCallback((notif: Omit<Notification, "id" | "createdAt" | "read">) => {
    pushNotification(notif);
    refresh();
  }, [refresh]);

  const markRead = useCallback((id: string) => {
    markAsRead(id);
    refresh();
  }, [refresh]);

  const markAllRead = useCallback(() => {
    if (!userId) return;
    markAllAsRead(userId);
    refresh();
  }, [userId, refresh]);

  const remove = useCallback((id: string) => {
    deleteNotification(id);
    refresh();
  }, [refresh]);

  return (
    <NotificationsContext.Provider value={{
      notifications, unreadCount, refresh, push, markRead, markAllRead, remove,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
