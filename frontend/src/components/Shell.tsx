import { useState, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import Logo from "./brand/Logo";
import { usePageTitle } from "../hooks/usePageTitle";

export default function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const roleTitle = user?.role === "PATIENT" ? "Patient" : user?.role === "DOCTOR" ? "Doctor" : user?.role === "NURSE" ? "Nurse" : user?.role === "ADMIN" ? "Admin" : undefined;
  usePageTitle(roleTitle);

  const getWorkstationName = () => {
    switch (user?.role) {
      case "DOCTOR": return "Doctor Clinical Workstation";
      case "NURSE": return "Nurse Care Workstation";
      case "ADMIN": return "Hospital Admin Console";
      case "PATIENT": return "Patient Care & Consent Portal";
      default: return "Healthcare Portal";
    }
  };

  const getRoleBadgeClass = () => {
    switch (user?.role) {
      case "DOCTOR": return "bg-blue-100 text-blue-800 border-blue-200";
      case "NURSE": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "ADMIN": return "bg-purple-100 text-purple-800 border-purple-200";
      case "PATIENT": return "bg-teal-50 text-teal-800 border-teal-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Workstation Badge */}
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 group focus:outline-teal rounded-lg">
              <Logo variant="full" size="md" />
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden md:block" />

            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {getWorkstationName()}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === "/dashboard" || location.pathname === "/"
                  ? "bg-teal-50 text-teal-800 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Workstation
            </Link>

            {user?.role === "ADMIN" && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  location.pathname === "/admin"
                    ? "bg-teal/10 text-teal"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Hospital Admin
              </Link>
            )}
          </nav>

          {/* User Controls & Notifications */}
          <div className="flex items-center gap-3">
            {/* Real-time Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-hidden"
                aria-label="Notifications"
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
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-slate-800">Live Care Alerts</h3>
                      <span className="text-[10px] font-bold bg-teal/10 text-teal px-2 py-0.5 rounded-full">
                        SSE Real-time
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Close
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No notifications yet. You will receive real-time alerts when clinical events occur.
                      </div>
                    ) : (
                      notifications.slice(0, 15).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 hover:bg-slate-50 transition flex items-start justify-between gap-3 ${
                            !n.readStatus ? "bg-teal/5" : ""
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-slate-900">{n.title}</h4>
                              {!n.readStatus && (
                                <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1.5 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!n.readStatus && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="text-[10px] text-teal hover:text-teal-dark font-medium shrink-0 pt-0.5"
                            >
                              Dismiss
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
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900">{user.fullName}</div>
                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md border mt-0.5 ${getRoleBadgeClass()}`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-semibold bg-teal text-white px-3 py-1.5 rounded-lg hover:bg-teal-dark transition"
              >
                Sign In
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
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ConsentCare EHR · Patient-Governed Healthcare Information System</span>
          <span className="text-[11px] text-slate-400">HL7 FHIR R4 Compliant · HIPAA/GDPR Granular Consent Engine</span>
        </div>
      </footer>
    </div>
  );
}
