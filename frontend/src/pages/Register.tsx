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

export default function Register() {
  const { t } = useTranslation();
  usePageTitle(t("auth.registerTitle"));
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("1995-01-01");
  const [gender, setGender] = useState("MALE");
  const [bloodGroup, setBloodGroup] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const [visualHelpOpen, setVisualHelpOpen] = useState(false);

  function handleNext(e?: FormEvent) {
    if (e) e.preventDefault();
    setError("");

    if (step === 1) {
      if (!fullName.trim()) {
        setError(t("errors.MISSING_REQUIRED_FIELDS"));
        return;
      }
      setStep(2);
      triggerHaptic(5);
      return;
    }

    if (step === 2) {
      if (!username.trim() || !email.trim()) {
        setError(t("errors.MISSING_REQUIRED_FIELDS"));
        return;
      }
      if (!email.includes("@")) {
        setError(t("errors.GENERIC"));
        return;
      }
      setStep(3);
      triggerHaptic(5);
      return;
    }

    if (step === 3) {
      if (!password || password.length < 6) {
        setError(t("errors.GENERIC"));
        return;
      }
      if (password !== confirmPassword) {
        setError(t("auth.passwordsDoNotMatch"));
        return;
      }
      setStep(4);
      triggerHaptic(5);
      return;
    }

    if (step === 4) {
      setStep(5);
      triggerHaptic(5);
      return;
    }

    if (step === 5) {
      submitRegistration();
    }
  }

  async function submitRegistration() {
    setError("");
    setLoading(true);
    triggerHaptic(10);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
      });
      setAccountReady(true);
      triggerHaptic(15);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

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

      {/* Main Registration Card */}
      <div className="max-w-md w-full mx-auto my-auto py-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-colors duration-150">
          {!accountReady ? (
            <>
              {/* Stepper Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {t("auth.registerTitle")}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t("auth.registerSubtitle")}
                </p>

                {/* Step Indicator & Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {t("auth.stepIndicator", { current: step, total: 5 })}
                    </span>
                    <span className="text-[11px] font-medium">
                      {step === 1 && t("auth.step1Title")}
                      {step === 2 && t("auth.step2Title")}
                      {step === 3 && t("auth.step3Title")}
                      {step === 4 && t("auth.step4Title")}
                      {step === 5 && t("auth.step5Title")}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div
                        key={s}
                        className={`h-full flex-1 transition-all duration-300 border-r border-white/20 dark:border-slate-900/40 last:border-r-0 ${
                          s <= step ? "bg-teal-600 dark:bg-teal-500" : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
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

              <form onSubmit={(e) => handleNext(e)} className="space-y-4">
                {/* STEP 1: NAME & PHONE */}
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("auth.step1Title")}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("auth.step1Desc")}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {t("auth.fullName")} *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t("auth.fullNamePlaceholder")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {t("auth.phone")}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t("auth.phonePlaceholder")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: USERNAME & EMAIL */}
                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("auth.step2Title")}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("auth.step2Desc")}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {t("auth.username")} *
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t("auth.usernamePlaceholder")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {t("auth.email")} *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("auth.emailPlaceholder")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: PASSWORD */}
                {step === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("auth.step3Title")}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("auth.step3Desc")}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {t("auth.password")} *
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("auth.passwordPlaceholder")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {t("auth.confirmPassword")} *
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("auth.confirmPasswordPlaceholder")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: BASIC HEALTH PROFILE */}
                {step === 4 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("auth.step4Title")}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("auth.step4Desc")}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                          {t("auth.dateOfBirth")}
                        </label>
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                          {t("auth.gender")}
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                        >
                          <option value="MALE">{t("auth.genderMale")}</option>
                          <option value="FEMALE">{t("auth.genderFemale")}</option>
                          <option value="OTHER">{t("auth.genderOther")}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        {t("auth.bloodGroup")} ({t("auth.optional")})
                      </label>
                      <input
                        type="text"
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        placeholder={t("auth.bloodGroupPlaceholder")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none transition"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5: REVIEW & CONFIRM */}
                {step === 5 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {t("auth.step5Title")}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t("auth.step5Desc")}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                      <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{t("auth.fullName")}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{fullName}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{t("auth.phone")}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{phone || "—"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{t("auth.username")}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{username}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{t("auth.email")}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{t("auth.dateOfBirth")}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{dateOfBirth || "—"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{t("auth.gender")}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {gender === "MALE"
                            ? t("auth.genderMale")
                            : gender === "FEMALE"
                            ? t("auth.genderFemale")
                            : t("auth.genderOther")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">{t("auth.bloodGroup")}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{bloodGroup || "—"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep((s) => s - 1);
                        setError("");
                        triggerHaptic(5);
                      }}
                      className="btn-tactile text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      {t("common.actions.previous")}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-tactile flex-1 bg-teal hover:bg-teal-dark text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span>{t("auth.creatingAccount")}</span>
                    ) : step === 5 ? (
                      <span>{t("auth.submitRegister")}</span>
                    ) : (
                      <span>{t("common.actions.next")} →</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Help & Login Callout */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setVisualHelpOpen(true);
                    triggerHaptic(5);
                  }}
                  className="text-xs font-semibold text-teal hover:text-teal-dark dark:text-teal-400 hover:underline mb-2 block mx-auto cursor-pointer"
                >
                  ❓ {t("auth.needHelp")} — {t("help.title")}
                </button>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t("auth.alreadyHaveAccount")}{" "}
                  <Link to="/login" className="text-teal hover:text-teal-dark dark:text-teal-400 font-bold hover:underline">
                    {t("auth.loginHere")}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* REGISTRATION COMPLETE SCREEN */
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center text-3xl font-bold shadow-xs">
                ✓
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {t("auth.accountReady")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                {t("auth.accountReadyDesc")}
              </p>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  navigate("/login");
                }}
                className="btn-tactile w-full bg-teal hover:bg-teal-dark text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-xs cursor-pointer mt-4"
              >
                {t("auth.goToLogin")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
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
