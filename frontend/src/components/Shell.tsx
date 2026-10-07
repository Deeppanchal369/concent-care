import { useState, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import Logo from "./brand/Logo";
import { usePageTitle } from "../hooks/usePageTitle";
import ThemeToggle from "./ui/ThemeToggle";
import LanguageToggle from "./ui/LanguageToggle";
import VisualHelpModal from "./help/VisualHelpModal";
import { triggerHaptic } from "../utils/haptics";

export default function Shell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVisualHelp, setShowVisualHelp] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const roleTitle = user?.role ? t(`common.roles.${user.role.toLowerCase()}`) : undefined;
  usePageTitle(roleTitle);

  const getWorkstationName = () => {
    switch (user?.role) {
      case "DOCTOR": return `${t("common.roles.doctor")} ${t("common.nav.dashboard")}`;
      case "NURSE": return `${t("common.roles.nurse")} ${t("common.nav.dashboard")}`;
      case "ADMIN": return `${t("common.roles.admin")} ${t("common.nav.dashboard")}`;
      case "PATIENT": return `${t("common.roles.patient")} ${t("common.nav.myHealth")}`;
      default: return t("common.appName");
    }
  };

  const getRoleBadgeClass = () => {
    switch (user?.role) {
      case "DOCTOR": return "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "NURSE": return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "ADMIN": return "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "PATIENT": return "bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800";
      default: return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200";
    }
  };

  const handleNotificationClick = async (n: { id: number; readStatus: boolean; referenceType?: string | null; referenceId?: string | null }) => {
    if (!n.readStatus) {
      await markAsRead(n.id);
    }
    setShowNotifications(false);
    triggerHaptic(10);

    if (n.referenceType === "PATIENT" && n.referenceId && (user?.role === "DOCTOR" || user?.role === "NURSE")) {
      navigate(`/patient/${n.referenceId}`);
    } else if (n.referenceType === "DOCUMENT") {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150 pb-16 md:pb-0">
      {/* Top Application Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Workstation Badge */}
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-teal rounded-lg">
              <Logo variant="full" size="md" />
            </Link>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {getWorkstationName()}
              </span>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === "/dashboard" || location.pathname === "/"
                  ? "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {t("common.nav.home")}
            </Link>

            {user?.role === "ADMIN" && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === "/admin"
                    ? "bg-teal/10 text-teal dark:text-teal-300"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {t("common.nav.oversight")}
              </Link>
            )}
          </nav>

          {/* User Controls & Notifications */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bilingual Language Switcher */}
            <LanguageToggle />

            {/* Global Theme Toggle */}
            <ThemeToggle />

            {/* Help / Guidance Button */}
            <button
              type="button"
              onClick={() => {
                setShowVisualHelp(true);
                triggerHaptic(10);
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
              title={t("help.title")}
              aria-label={t("help.title")}
            >
              <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Real-time Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  triggerHaptic(10);
                }}
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"
                aria-label={t("common.nav.notifications")}
                aria-expanded={showNotifications}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-100">{t("notifications.title")}</h3>
                      <span className="text-[10px] font-bold bg-teal/10 dark:bg-teal-950/80 text-teal dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200/50 dark:border-teal-800/50">
                        {t("notifications.realtime")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllAsRead()}
                          className="text-[11px] font-medium text-teal hover:text-teal-dark dark:text-teal-400 hover:underline"
                        >
                          {t("notifications.markAllRead")}
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        aria-label={t("common.actions.close")}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        {t("notifications.empty")}
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-start justify-between gap-3 ${
                            !n.readStatus ? "bg-teal-50/30 dark:bg-teal-950/20" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{n.title}</h4>
                              {!n.readStatus && (
                                <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!n.readStatus && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                                triggerHaptic(10);
                              }}
                              className="text-[10px] text-teal hover:text-teal-dark dark:text-teal-400 font-medium shrink-0 pt-0.5"
                            >
                              {t("notifications.dismiss")}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user.fullName}</div>
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md border mt-0.5 ${getRoleBadgeClass()}`}>
                    {t(`common.roles.${user.role.toLowerCase()}`)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="btn-tactile text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg transition"
                >
                  {t("common.actions.logout")}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-tactile text-xs font-semibold bg-teal text-white px-3 py-1.5 rounded-lg hover:bg-teal-dark transition"
              >
                {t("common.actions.login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t("common.appName")} · {t("common.tagline")}</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{t("consent.subtitle")}</span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (Visible on mobile, max 4-5 items) */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-2 px-2 safe-area-bottom">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition ${
              location.pathname === "/dashboard" || location.pathname === "/"
                ? "text-teal dark:text-teal-400 font-bold"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <span className="text-base">🏠</span>
            <span>{t("common.nav.home")}</span>
          </Link>

          {user.role === "PATIENT" && (
            <Link
              to="/dashboard"
              className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              <span className="text-base">❤️</span>
              <span>{t("common.nav.myHealth")}</span>
            </Link>
          )}

          {user.role === "DOCTOR" && (
            <Link
              to="/dashboard"
              className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              <span className="text-base">👥</span>
              <span>{t("common.nav.patients")}</span>
            </Link>
          )}

          {user.role === "NURSE" && (
            <Link
              to="/dashboard"
              className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              <span className="text-base">✅</span>
              <span>{t("common.nav.myTasks")}</span>
            </Link>
          )}

          {user.role === "ADMIN" && (
            <Link
              to="/admin"
              className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition ${
                location.pathname === "/admin"
                  ? "text-teal dark:text-teal-400 font-bold"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <span className="text-base">📊</span>
              <span>{t("common.nav.dashboard")}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              setShowVisualHelp(true);
              triggerHaptic(5);
            }}
            className="flex flex-col items-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          >
            <span className="text-base">❓</span>
            <span>{t("common.nav.help")}</span>
          </button>
        </nav>
      )}

      {/* Visual Tutorial & Help Modal (English + Gujarati) */}
      <VisualHelpModal
        isOpen={showVisualHelp}
        onClose={() => setShowVisualHelp(false)}
        defaultRole={user?.role as any}
      />
    </div>
  );
}
