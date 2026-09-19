import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../api/errors";
import Logo from "../components/brand/Logo";
import { usePageTitle } from "../hooks/usePageTitle";

export default function Login() {
  usePageTitle("Login");
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your username or email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError("");
    setLoading(true);
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
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Simple Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 focus:outline-teal rounded-lg">
          <Logo variant="full" size="md" />
        </Link>
        <Link
          to="/"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1"
        >
          <span>← Back to home</span>
        </Link>
      </div>

      {/* Main Login Form Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Sign in to ConsentCare
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Enter your credentials to access your healthcare workstation.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className="mb-5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-2.5"
              role="alert"
            >
              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Username or Email
              </label>
              <input
                id="cc-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                disabled={loading}
                placeholder="e.g. your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            {/* Password with Visibility Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="cc-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setHelpOpen(!helpOpen)}
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold focus:outline-teal"
                >
                  Forgot password?
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs disabled:bg-slate-50 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 focus:outline-teal rounded-lg transition"
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

            {/* Contextual Account Help Drawer */}
            {helpOpen && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <strong className="block text-slate-800 font-semibold">Account Recovery</strong>
                <p>
                  For security and patient confidentiality, password changes are processed through institutional administration.
                </p>
                <p className="text-slate-500">
                  Please contact your hospital medical records desk or system administrator to verify your identity and reset your access.
                </p>
              </div>
            )}

            {/* Submit Button with Loading State */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 focus:outline-teal mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign in to Workstation</span>
              )}
            </button>
          </form>

          {/* Patient Registration Callout */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-600">
              New patient?{" "}
              <Link to="/register" className="text-teal-700 font-bold hover:underline focus:outline-teal">
                Create patient account
              </Link>
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Clinical staff accounts are created by your healthcare administrator.
            </p>
          </div>

          {/* Development-Only Testing Drawer (strictly excluded from production builds) */}
          {isDevelopment && (
            <div className="mt-6 pt-4 border-t border-dashed border-slate-300">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-2">
                Local Dev Quick-Fill (Hidden in Production)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDevRole("dr.jenkins", "Doctor@123")}
                  className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  <span className="font-bold block text-slate-900 text-[11px]">Dr. Jenkins</span>
                  <span className="text-[10px] text-slate-500">Attending MD</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDevRole("nurse.elena", "Nurse@123")}
                  className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  <span className="font-bold block text-slate-900 text-[11px]">Nurse Elena</span>
                  <span className="text-[10px] text-slate-500">Care RN</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDevRole("patient.eleanor.vance", "Patient@123")}
                  className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  <span className="font-bold block text-slate-900 text-[11px]">Eleanor Vance</span>
                  <span className="text-[10px] text-slate-500">Patient Portal</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDevRole("admin", "Admin@12345")}
                  className="p-2 text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  <span className="font-bold block text-slate-900 text-[11px]">Admin</span>
                  <span className="text-[10px] text-slate-500">Hospital Console</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-slate-500">
        <p>Protected by ConsentCare Zero-Trust Architecture</p>
      </div>
    </div>
  );
}
