import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/brand/Logo";
import CareCircleVisual from "../components/CareCircleVisual";
import HowItWorksModal from "../components/help/HowItWorksModal";
import { usePageTitle } from "../hooks/usePageTitle";
import ThemeToggle from "../components/ui/ThemeToggle";
import LanguageToggle from "../components/ui/LanguageToggle";

export default function Landing() {
  const { t } = useTranslation();
  usePageTitle();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showHowItWorksVideo, setShowHowItWorksVideo] = useState(false);

  const toggleFaq = (idx: number) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-teal-100 selection:text-teal-900 dark:selection:bg-teal-950 dark:selection:text-teal-200 transition-colors duration-150">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
          {/* LEFT: Logo Wordmark & Emblem */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg">
              <Logo variant="full" size="md" />
            </Link>
          </div>

          {/* CENTER: Concise Navigation Links (No wrapping on desktop) */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#about" className="hover:text-teal-700 dark:hover:text-teal-300 transition whitespace-nowrap">{t("landing.navAbout")}</a>
            <a href="#how-it-works" className="hover:text-teal-700 dark:hover:text-teal-300 transition whitespace-nowrap">{t("landing.navHowItWorks")}</a>
            <a href="#care-circle" className="hover:text-teal-700 dark:hover:text-teal-300 transition whitespace-nowrap">{t("landing.navCareCircle")}</a>
            <a href="#sharing" className="hover:text-teal-700 dark:hover:text-teal-300 transition whitespace-nowrap">{t("landing.navSecurity")}</a>
          </nav>

          {/* RIGHT: How It Works Video, Language, Theme, & Action CTA */}
          <div className="hidden lg:flex items-center gap-2.5 xl:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowHowItWorksVideo(true)}
              className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80 text-xs font-bold transition whitespace-nowrap focus-visible:ring-2 focus-visible:ring-teal-500"
              title={t("landing.watchDemoTooltip", "Watch 1-Minute Walkthrough Video")}
            >
              <span className="text-[10px] text-teal-600 dark:text-teal-400">▶</span>
              <span>{t("landing.watchDemo")}</span>
            </button>

            <LanguageToggle />
            <ThemeToggle />

            {user ? (
              <Link
                to="/dashboard"
                className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal text-white hover:bg-teal-dark text-sm font-bold shadow-xs transition focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none whitespace-nowrap"
              >
                <span>{t("landing.openWorkstation")}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="btn-tactile px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none whitespace-nowrap"
                >
                  {t("landing.signIn")}
                </Link>
                <Link
                  to="/register"
                  className="btn-tactile px-4 py-2 rounded-xl bg-teal text-white hover:bg-teal-dark text-sm font-bold shadow-xs transition focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none whitespace-nowrap"
                >
                  {t("landing.createAccount")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Controls: Language, Theme, & Drawer Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setShowHowItWorksVideo(true)}
              className="p-1.5 rounded-lg text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 font-bold text-xs flex items-center gap-1"
              title={t("landing.watchDemoTooltip", "Watch 1-Minute Walkthrough Video")}
            >
              <span>▶</span>
              <span className="hidden sm:inline">{t("landing.watchDemo")}</span>
            </button>
            <LanguageToggle />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Responsive Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-5 space-y-3 shadow-lg">
            <nav className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-teal transition">{t("landing.navAbout")}</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-teal transition">{t("landing.navHowItWorks")}</a>
              <a href="#care-circle" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-teal transition">{t("landing.navCareCircle")}</a>
              <a href="#sharing" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-teal transition">{t("landing.navSecurity")}</a>
            </nav>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowHowItWorksVideo(true);
                }}
                className="btn-tactile w-full text-center py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800 flex items-center justify-center gap-1.5"
              >
                <span>▶</span>
                <span>{t("landing.watchDemo")} (1-Min Guide)</span>
              </button>
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-teal text-white font-bold text-sm"
                >
                  {t("landing.openWorkstation")}
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {t("landing.signIn")}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-teal text-white font-bold text-sm shadow-xs"
                  >
                    {t("landing.createAccount")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ---------------------------------------------------- */}
      {/* HERO SECTION */}
      {/* ---------------------------------------------------- */}
      <section className="py-12 sm:py-20 lg:py-24 bg-gradient-to-b from-teal-50/50 via-white to-slate-50 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust Banner */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 animate-pulse" />
            {t("landing.heroBadge")}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            <Logo variant="wordmark" size="xl" showBadge={true} />
          </h1>

          <p className="mt-5 text-lg sm:text-xl lg:text-2xl text-slate-700 dark:text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed">
            {t("landing.heroTitle")}
          </p>

          <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {t("landing.heroSubtitle")}
          </p>

          {/* Primary Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/register"
              className="btn-tactile w-full sm:w-auto px-7 py-3.5 rounded-xl bg-teal text-white hover:bg-teal-dark font-bold text-base shadow-xs transition focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none text-center"
            >
              {t("landing.getStarted")}
            </Link>
            <Link
              to="/login"
              className="btn-tactile w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base border border-slate-300 dark:border-slate-700 shadow-2xs transition focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none text-center"
            >
              {t("landing.signIn")}
            </Link>
          </div>

          {/* Safety & Compliance Indicators */}
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Patient Data Sovereignty</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">You grant and revoke access at any time.</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Verified Clinical Access</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Every record request verified server-side.</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Coordinated Care Team</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Doctors and nurses work with synchronized data.</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Advisory Clinical Support</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">AI assists review; clinicians make decisions.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* WHAT IS AROGYAMITRA? */}
      {/* ---------------------------------------------------- */}
      <section id="about" className="py-16 sm:py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider">
              A Simpler Way to Manage Care
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {t("common.landing.navAbout", "About ArogyaMitra")}
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              ArogyaMitra is a patient-directed electronic health record system. It replaces paper files and closed hospital portals with a clear, private digital health profile governed by the patient.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                One Complete Health Story
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your past diagnoses, hospital visits, prescriptions, vitals, and lab tests stored together so nothing gets lost between appointments.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Permission in Your Hands
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Doctors only see what you allow them to see. If you want a specialist to review your cardiology labs but not other notes, you choose that category.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Clear Activity Ledger
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Every time your records are viewed or updated, it is recorded in your activity ledger. You can inspect who accessed your chart and when.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* HOW IT WORKS */}
      {/* ---------------------------------------------------- */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider">
              {t("landing.navHowItWorks", "How It Works")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {t("howItWorksModal.title", "How ArogyaMitra Works")}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              {t("howItWorksModal.subtitle", "1-minute guide to patient-governed healthcare and care team coordination")}
            </p>
          </div>

          {/* 1-Minute Walkthrough Video Trigger Card */}
          <div className="mb-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-md border border-teal-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center text-xl shrink-0">
                ▶
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block mb-0.5">
                  {t("howItWorksModal.subtitle", "1-minute guide to patient-governed healthcare")}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {t("howItWorksModal.title", "How ArogyaMitra Works")}
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  {t("howItWorksModal.videoFallbackHint", "Follow the 4-step care flow or watch the complete video walkthrough.")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHowItWorksVideo(true)}
              className="btn-tactile px-5 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-xs shadow-xs transition shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <span>▶</span>
              <span>{t("landing.watchDemo", "How It Works")}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-extrabold text-teal dark:text-teal-400 uppercase tracking-wider">
                {t("careCircle.step1", "Step 1")}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 mb-2">
                {t("howItWorksModal.step1Title", "Patient Grants Consent")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("howItWorksModal.step1Desc", "You decide which doctors can access your health record and for how long.")}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-extrabold text-teal dark:text-teal-400 uppercase tracking-wider">
                {t("careCircle.step2", "Step 2")}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 mb-2">
                {t("howItWorksModal.step2Title", "Doctor Requests Specific Records")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("howItWorksModal.step2Desc", "Attending physicians submit access requests for specific clinical categories.")}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-extrabold text-teal dark:text-teal-400 uppercase tracking-wider">
                {t("careCircle.step3", "Step 3")}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 mb-2">
                {t("howItWorksModal.step3Title", "Patient Approves or Revokes")}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("howItWorksModal.step3Desc", "Approve access with one tap, or revoke instantly whenever you choose.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* CARE CIRCLE */}
      {/* ---------------------------------------------------- */}
      <section id="care-circle" className="py-16 sm:py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider">
              {t("careCircle.heroBadge", "Care Coordination")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {t("careCircle.sectionTitle", "Patient-Centered Care Circle")}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              {t("careCircle.sectionSubtitle", "Privacy-first collaboration between patients, doctors, and nurses")}
            </p>
          </div>

          {/* Interactive Care Circle Visual Flow Component */}
          <CareCircleVisual />
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* PRIVATE RECORD SHARING */}
      {/* ---------------------------------------------------- */}
      <section id="sharing" className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider">
              Built Around Consent
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              Private Record Sharing
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Granular consent replaces all-or-nothing medical record disclosure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                11 Granular Clinical Categories
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Share only what is relevant to the care encounter:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">✓ Clinical Encounters</span>
                <span className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">✓ Active Diagnoses</span>
                <span className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">✓ Lab Results</span>
                <span className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">✓ Prescriptions</span>
                <span className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">✓ Vital Signs</span>
                <span className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">✓ Medical Documents</span>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Time-Limited & Instantly Revocable
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Consents automatically expire after the consultation window you select (e.g. 7 days, 30 days, or 1 year). You can also click "Revoke" at any time to immediately withdraw doctor access.
                </p>
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 text-xs text-teal-900 dark:text-teal-200">
                <strong className="block font-bold mb-0.5">Strict Rule: No Administrator Bypass</strong>
                <span>Hospital administrators manage accounts and security, but cannot open or inspect private patient clinical records without patient consent.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* CLINICAL DECISION ASSISTANCE */}
      {/* ---------------------------------------------------- */}
      <section id="ai-records" className="py-16 sm:py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider">
              Smarter Document Review
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              AI-Assisted Health Records
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Practical automated assistance designed to save clinical time, with medical professionals always in control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider mb-2">
                <span>📄 Document Extraction</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Automated Lab & Report Extraction
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                When lab reports or discharge summaries are uploaded, our document pipeline extracts quantifiable test values (such as Blood Glucose, HbA1c, and Hemoglobin) so clinicians don't have to re-type data manually.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider mb-2">
                <span>📊 Clinical Decision Support</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                30-Day Readmission Risk Indicator
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Trained on standardized clinical benchmarks, the risk engine highlights potential readmission factors (like visit frequency and active medications) to help doctors focus extra follow-up care where it helps most.
              </p>
            </div>
          </div>

          {/* Explicit Safety Notice */}
          <div className="mt-8 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <strong className="font-bold block mb-0.5">Clinical Safety Notice</strong>
              <span>
                ArogyaMitra AI tools are assistive decision-support aids. They do not replace doctors, make automatic diagnoses, or prescribe medications. All clinical decisions remain strictly with the licensed medical team.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* ROLE PORTALS */}
      {/* ---------------------------------------------------- */}
      <section id="roles" className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider">
              Tailored Workspaces
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              Designed for Patients and Care Teams
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Dedicated, uncluttered workstations tailored to each person's role.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* For Patients */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-black text-sm mb-4">
                  P
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  For Patients
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-teal font-bold">✓</span>
                    <span>View all your clinical encounters and diagnoses in one place.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal font-bold">✓</span>
                    <span>Grant or revoke doctor access with a single click.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal font-bold">✓</span>
                    <span>Upload medical documents for safe storage and automated summaries.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal font-bold">✓</span>
                    <span>Full access audit trail shows every time a record is viewed.</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/register"
                className="btn-tactile w-full py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 font-bold text-xs text-center border border-teal-200 dark:border-teal-800 transition"
              >
                Create patient account →
              </Link>
            </div>

            {/* For Doctors */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-black text-sm mb-4">
                  MD
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  For Doctors
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                    <span>Request consent directly from patients for clinical care.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                    <span>Review verified medical history, vitals, and lab flowsheets.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                    <span>Delegate care tasks and medication orders to assigned nurses.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                    <span>Advisory readmission risk scoring for proactive discharge planning.</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/login"
                className="btn-tactile w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 font-bold text-xs text-center border border-blue-200 dark:border-blue-800 transition"
              >
                Clinician sign in →
              </Link>
            </div>

            {/* For Nurses */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-black text-sm mb-4">
                  RN
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  For Nurses
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                    <span>Real-time bedside care task queue ordered by clinical priority.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                    <span>Log medication administrations: Given, Held, or Refused.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                    <span>Quickly record patient vital signs into the continuous flowsheet.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                    <span>One-tap duty availability status toggle for shift coordination.</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/login"
                className="btn-tactile w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold text-xs text-center border border-emerald-200 dark:border-emerald-800 transition"
              >
                Nursing staff sign in →
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Clinical staff accounts are created by your healthcare administrator.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* CONTEXTUAL FAQ */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Clear answers about privacy, record ownership, and security.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "What does this mean: 'Patient Data Sovereignty'?",
                a: "It means you are the authoritative owner of your medical records. No physician or clinical staff member can view your medical notes or history until you explicitly grant permission for that specific purpose.",
              },
              {
                q: "Can hospital administrators read my private medical notes?",
                a: "No. Under ArogyaMitra's role-based, consent-driven access model, administrator privileges are strictly operational (managing user accounts, auditing system health, and provisioning staff). Clinical medical charts require patient consent.",
              },
              {
                q: "How does a doctor request access to my health file?",
                a: "Your doctor submits a digital access request specifying the care purpose (e.g. general consultation, cardiology evaluation) and timeframe. You receive an alert and can approve or decline with one tap.",
              },
              {
                q: "What happens when I click 'Revoke'?",
                a: "Access terminates immediately at the database level. Any ongoing consultation sessions are invalidated and the doctor can no longer view your clinical data.",
              },
            ].map((item, idx) => (
              <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-5 py-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 transition"
                >
                  <span>{item.q}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal ml-3">
                    {expandedFaq === idx ? "−" : "+"}
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div className="px-5 py-4 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-800">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* FOOTER */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-white py-12 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div>
              <Logo variant="full" size="md" dark />
              <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
                Patient-Governed Electronic Health Record (EHR) System with consent-based sharing and real-time clinical care team coordination.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
              <Link to="/login" className="hover:text-white transition">Sign in</Link>
              <span>•</span>
              <Link to="/register" className="hover:text-white transition">Patient Registration</Link>
              <span>•</span>
              <a href="#about" className="hover:text-white transition">About</a>
              <span>•</span>
              <a href="#care-circle" className="hover:text-white transition">Care Circle</a>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} ArogyaMitra EHR. All rights reserved.</p>
            <p className="text-[11px] text-slate-400">
              Privacy-focused access controls • Consent-governed health records
            </p>
          </div>
        </div>
      </footer>

      {/* Functional Video Modal with Real HTML5 Video Player */}
      <HowItWorksModal
        isOpen={showHowItWorksVideo}
        onClose={() => setShowHowItWorksVideo(false)}
      />
    </div>
  );
}
