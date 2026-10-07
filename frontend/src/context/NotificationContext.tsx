import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { api, API_BASE, type NotificationItem } from "../api/client";
import { useAuth } from "./AuthContext";
import { triggerHaptic } from "../utils/haptics";

export interface AppToast {
  id?: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  retry?: () => void;
  duration?: number;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  latestToast: NotificationItem | null;
  clearToast: () => void;
  showToast: (toast: AppToast) => void;
  appToast: AppToast | null;
  clearAppToast: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [latestToast, setLatestToast] = useState<NotificationItem | null>(null);
  const [appToast, setAppToast] = useState<AppToast | null>(null);
  const toastTimerRef = useRef<any>(null);
  const appToastTimerRef = useRef<any>(null);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const items = await api.listNotifications();
      // Ensure sorted by createdAt descending and deduplicated
      const uniqueMap = new Map<number, NotificationItem>();
      for (const item of items) {
        uniqueMap.set(item.id, item);
      }
      setNotifications(Array.from(uniqueMap.values()).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {
      // ignore network errors
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
    let isMounted = true;

    function connectSSE() {
      if (!isMounted) return;
      const sseUrl = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token!)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("notification", (event) => {
        if (!isMounted) return;
        try {
          const item: NotificationItem = JSON.parse(event.data);
          setNotifications((prev) => {
            const existingIndex = prev.findIndex((n) => n.id === item.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], ...item };
              return updated;
            }
            return [item, ...prev];
          });
          setLatestToast(item);
          triggerHaptic(15);

          // Auto clear toast after 6 seconds
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => {
            if (isMounted) setLatestToast(null);
          }, 6000);
        } catch {
          // ignore parse error
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (isMounted) {
          // Reconnect with backoff
          retryTimer = setTimeout(connectSSE, 5000);
        }
      };
    }

    connectSSE();

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      if (retryTimer) clearTimeout(retryTimer);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
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

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readStatus: true }))
      );
      triggerHaptic(10);
    } catch {
      // ignore
    }
  };

  const clearToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setLatestToast(null);
  };

  const clearAppToast = () => {
    if (appToastTimerRef.current) clearTimeout(appToastTimerRef.current);
    setAppToast(null);
  };

  const showToast = (toast: AppToast) => {
    if (appToastTimerRef.current) clearTimeout(appToastTimerRef.current);
    setAppToast(toast);

    if (toast.type === "error") {
      triggerHaptic(25);
    } else {
      triggerHaptic(10);
    }

    const duration = toast.duration ?? (toast.type === "error" && toast.retry ? 8000 : 5000);
    appToastTimerRef.current = setTimeout(() => {
      setAppToast(null);
    }, duration);
  };

  const unreadCount = notifications.filter((n) => !n.readStatus).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refresh: loadNotifications,
        latestToast,
        clearToast,
        showToast,
        appToast,
        clearAppToast,
      }}
    >
      {children}

      {/* Permanent Accessible Live Region for Screen Readers */}
      <div
        id="toast-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {appToast ? `${appToast.title ? appToast.title + ': ' : ''}${appToast.message}` : ""}
      </div>

      {/* Global Application Toast (4-State Form & Action Feedback with Retry) */}
      {appToast && (
        <div
          role={appToast.type === "error" ? "alert" : "status"}
          aria-live={appToast.type === "error" ? "assertive" : "polite"}
          className={`fixed top-5 right-5 z-50 max-w-sm w-full sm:w-96 rounded-2xl shadow-xl dark:shadow-2xl p-4 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-3 duration-200 border bg-white dark:bg-slate-900 ${
            appToast.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-slate-100"
              : appToast.type === "error"
              ? "border-rose-300 dark:border-rose-800 text-slate-900 dark:text-slate-100"
              : appToast.type === "warning"
              ? "border-amber-300 dark:border-amber-800 text-slate-900 dark:text-slate-100"
              : "border-teal-200 dark:border-teal-800 text-slate-900 dark:text-slate-100"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
              appToast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                : appToast.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                : appToast.type === "warning"
                ? "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                : "bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300"
            }`}
          >
            {appToast.type === "success" ? "✓" : appToast.type === "error" ? "✕" : appToast.type === "warning" ? "!" : "ℹ"}
          </div>

          <div className="flex-1 min-w-0">
            {appToast.title && (
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {appToast.title}
              </h4>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {appToast.message}
            </p>
            {appToast.retry && (
              <button
                type="button"
                onClick={() => {
                  clearAppToast();
                  appToast.retry?.();
                }}
                className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>🔄</span>
                <span>Retry</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={clearAppToast}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {/* SSE Real-Time Notification Toast */}
      {latestToast && !appToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-full sm:w-96 bg-white dark:bg-slate-900 border border-teal/20 dark:border-teal/40 rounded-2xl shadow-xl dark:shadow-2xl p-4 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{latestToast.title}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">{latestToast.message}</p>
          </div>
          <button
            onClick={clearToast}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Dismiss notification alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
