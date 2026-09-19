import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, API_BASE, type NotificationItem } from "../api/client";
import { useAuth } from "./AuthContext";

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
  latestToast: NotificationItem | null;
  clearToast: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [latestToast, setLatestToast] = useState<NotificationItem | null>(null);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const items = await api.listNotifications();
      setNotifications(items);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLatestToast(null);
      return;
    }

    loadNotifications();

    const token = localStorage.getItem("cc_token");
    if (!token) return;

    let eventSource: EventSource | null = null;
    let retryTimer: any = null;

    function connectSSE() {
      const sseUrl = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token!)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("notification", (event) => {
        try {
          const item: NotificationItem = JSON.parse(event.data);
          setNotifications((prev) => [item, ...prev]);
          setLatestToast(item);
        } catch {
          // ignore parse error
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Auto-reconnect in 5s
        retryTimer = setTimeout(connectSSE, 5000);
      };
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [user]);

  const markAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readStatus: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const clearToast = () => setLatestToast(null);

  const unreadCount = notifications.filter((n) => !n.readStatus).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        refresh: loadNotifications,
        latestToast,
        clearToast,
      }}
    >
      {children}
      {latestToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-white border border-teal/20 rounded-xl shadow-2xl p-4 animate-slide-in flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-teal/10 text-teal flex items-center justify-center font-bold text-sm shrink-0">
            🔔
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-800">{latestToast.title}</h4>
            <p className="text-xs text-slate-600 mt-0.5">{latestToast.message}</p>
          </div>
          <button
            onClick={clearToast}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

