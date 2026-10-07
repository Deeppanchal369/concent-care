import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../api/errors";
import Logo from "../components/brand/Logo";
import { usePageTitle } from "../hooks/usePageTitle";
import ThemeToggle from "../components/ui/ThemeToggle";
import LanguageToggle from "../components/ui/LanguageToggle";
import VisualHelpModal from "../components/help/VisualHelpModal";
import { triggerHaptic } from "../utils/haptics";

export default function Login() {
  const { t } = useTranslation();
  usePageTitle(t("auth.signIn"));
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [visualHelpOpen, setVisualHelpOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t("errors.MISSING_REQUIRED_FIELDS"));
      return;
    }

    setError("");
    setLoading(true);
    triggerHaptic(10);
    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // Developer testing helper (strictly excluded from production builds)
  const isDevelopment = Boolean(import.meta.env.DEV);

  const fillDevRole = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    triggerHaptic(5);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-teal-100 selection:text-teal-900 dark:selection:bg-teal-950 dark:selection:text-teal-200 transition-colors duration-150">
      {/* Top Header with Language and Theme Toggles */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg">
          <Logo variant="full" size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Login Form Card */}
      <div className="max-w-md w-full mx-auto my-auto py-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-colors duration-150">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {t("auth.signIn")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {t("auth.signInPrompt")}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className="mb-5 text-xs font-medium text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl px-4 py-3 flex items-start gap-2.5"
              role="alert"
            >
              <svg className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username or Email */}
            <div>
              <label
                htmlFor="cc-username"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {t("auth.usernameOrEmail")}
              </label>
              <input
                id="cc-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                disabled={loading}
                placeholder={t("auth.usernamePlaceholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition shadow-2xs disabled:bg-slate-50 dark:disabled:bg-slate-850 disabled:text-slate-500"
              />
            </div>

            {/* Password with Visibility Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="cc-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  {t("auth.password")}
                </label>
                <button
                  type="button"
                  onClick={() => setHelpOpen(!helpOpen)}
                  className="text-xs text-teal hover:text-teal-dark dark:text-teal-400 dark:hover:text-teal-300 font-semibold focus-visible:outline-none"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>

              <div className="relative">
                <input
                  id="cc-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition shadow-2xs disabled:bg-slate-50 dark:disabled:bg-slate-850 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-none rounded-lg transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Contextual Account Help */}
            {helpOpen && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <strong className="block text-slate-800 dark:text-slate-200 font-semibold">{t("auth.forgotPassword")}</strong>
                <p>{t("auth.forgotPasswordHelp")}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-tactile w-full bg-teal hover:bg-teal-dark text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{t("auth.signingIn")}</span>
                </>
              ) : (
                <span>{t("auth.signIn")}</span>
              )}
            </button>
          </form>

          {/* Visual Help & Onboarding Link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setVisualHelpOpen(true);
                triggerHaptic(5);
              }}
              className="text-xs font-semibold text-teal hover:text-teal-dark dark:text-teal-400 hover:underline inline-flex items-center gap-1"
            >
              <span>❓</span>
              <span>{t("auth.needHelp")} — {t("help.title")}</span>
            </button>
          </div>

          {/* Patient Registration Callout */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t("auth.noAccount")}{" "}
              <Link to="/register" className="text-teal hover:text-teal-dark dark:text-teal-400 font-bold hover:underline">
                {t("auth.registerHere")}
              </Link>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-2">
              {t("auth.staffNote")}
            </p>
          </div>

          {/* Development Quick-Fill */}
          {isDevelopment && (
            <div className="mt-6 pt-4 border-t border-dashed border-slate-300 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-center mb-2">
                Development Quick-Fill
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDevRole("dr.jenkins", "Doctor@123")}
                  className="p-2 text-left rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition"
                >
                  <span className="font-bold block text-slate-900 dark:text-slate-100 text-[11px]">Dr. Jenkins</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDevRole("nurse.elena", "Nurse@123")}
                  className="p-2 text-left rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition"
                >
                  <span className="font-bold block text-slate-900 dark:text-slate-100 text-[11px]">Nurse Elena</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Nurse</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDevRole("patient.eleanor.vance", "Patient@123")}
                  className="p-2 text-left rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition"
                >
                  <span className="font-bold block text-slate-900 dark:text-slate-100 text-[11px]">Eleanor Vance</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDevRole("admin", "Admin@12345")}
                  className="p-2 text-left rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition"
                >
                  <span className="font-bold block text-slate-900 dark:text-slate-100 text-[11px]">Admin</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Admin</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-slate-500 dark:text-slate-400">
        <p>{t("common.tagline")}</p>
      </div>

      {/* Visual Help Modal */}
      <VisualHelpModal
        isOpen={visualHelpOpen}
        onClose={() => setVisualHelpOpen(false)}
        defaultRole="PATIENT"
      />
    </div>
  );
}
