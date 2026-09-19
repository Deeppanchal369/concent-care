import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/brand/Logo";
import CareCircleVisual from "../components/CareCircleVisual";
import { usePageTitle } from "../hooks/usePageTitle";

export default function Landing() {
  usePageTitle(); // sets document.title to "ConsentCare"
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group focus:outline-teal rounded-lg">
            <Logo variant="full" size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#about" className="hover:text-teal-700 transition">What is ConsentCare</a>
            <a href="#how-it-works" className="hover:text-teal-700 transition">How It Works</a>
            <a href="#care-circle" className="hover:text-teal-700 transition">Care Circle</a>
            <a href="#sharing" className="hover:text-teal-700 transition">Private Sharing</a>
            <a href="#ai-records" className="hover:text-teal-700 transition">AI-Assisted Records</a>
            <a href="#roles" className="hover:text-teal-700 transition">For You</a>
          </nav>

          {/* CTA Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shadow-xs transition focus:outline-teal"
              >
                <span>Open Workstation</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition focus:outline-teal"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shadow-xs transition focus:outline-teal"
                >
                  Create patient account
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-teal"
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

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3">
            <nav className="flex flex-col gap-2.5 text-sm font-medium text-slate-700">
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-1">What is ConsentCare</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1">How It Works</a>
              <a href="#care-circle" onClick={() => setMobileMenuOpen(false)} className="py-1">Care Circle</a>
              <a href="#sharing" onClick={() => setMobileMenuOpen(false)} className="py-1">Private Sharing</a>
              <a href="#ai-records" onClick={() => setMobileMenuOpen(false)} className="py-1">AI-Assisted Records</a>
              <a href="#roles" onClick={() => setMobileMenuOpen(false)} className="py-1">Roles & Workflows</a>
            </nav>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-teal-700 text-white font-bold text-sm"
                >
                  Open Workstation
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl border border-slate-300 font-semibold text-sm text-slate-800"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-teal-700 text-white font-bold text-sm"
                  >
                    Create patient account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ---------------------------------------------------- */}
      {/* HERO SECTION */}
      {/* ---------------------------------------------------- */}
      <section className="py-12 sm:py-20 lg:py-24 bg-gradient-to-b from-teal-50/40 via-white to-slate-50 border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust Banner */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100/80 border border-teal-200 text-teal-900 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            Patient-Governed Electronic Health Record System
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Consent<span className="text-teal-700">Care</span>
          </h1>

          <p className="mt-5 text-lg sm:text-xl lg:text-2xl text-slate-700 font-medium max-w-3xl mx-auto leading-relaxed">
            "Your health information, shared with the people caring for you — when you choose."
          </p>

          <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
            A secure health records platform designed around patient consent. Connect your medical history, approve your clinical team, and stay in control of who views your records.
          </p>

          {/* Primary Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-base shadow-sm transition focus:outline-teal text-center"
            >
              Create patient account
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-base border border-slate-300 shadow-2xs transition focus:outline-teal text-center"
            >
              Sign in to workstation
            </Link>
          </div>

          {/* Safety & Compliance Indicators */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 block">Patient Data Sovereignty</span>
              <span className="text-[11px] text-slate-500">You grant and revoke access at any time.</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 block">Zero-Trust Clinical Access</span>
              <span className="text-[11px] text-slate-500">Every record request verified server-side.</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 block">Coordinated Care Team</span>
              <span className="text-[11px] text-slate-500">Doctors and nurses work with synchronized data.</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-900 block">Advisory Clinical Support</span>
              <span className="text-[11px] text-slate-500">AI assists review; clinicians make decisions.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 1. WHAT IS CONSENTCARE? */}
      {/* ---------------------------------------------------- */}
      <section id="about" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Section 1
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              What is ConsentCare?
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
              ConsentCare is a patient-directed electronic health record system. It replaces paper files and closed hospital portals with a clear, private digital health profile governed by the patient.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                One Complete Health Story
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your past diagnoses, hospital visits, prescriptions, vitals, and lab tests stored together so nothing gets lost between appointments.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Permission in Your Hands
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Doctors only see what you allow them to see. If you want a specialist to review your cardiology labs but not other notes, you choose that category.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Clear Activity Ledger
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every time your records are viewed or updated, it is recorded in your activity ledger. You can inspect who accessed your chart and when.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 2. HOW IT WORKS */}
      {/* ---------------------------------------------------- */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Section 2
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              How It Works
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Three straightforward steps from sign-up to synchronized care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-extrabold text-teal-700 uppercase tracking-wider">Step 1</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
                Create Your Profile
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Register as a patient with your basic details and medical history. Your health record is created privately under your ownership.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-extrabold text-teal-700 uppercase tracking-wider">Step 2</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
                Connect Your Care Team
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When you visit an attending physician, approve their access request or grant consent for the relevant clinical categories and time duration.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-extrabold text-teal-700 uppercase tracking-wider">Step 3</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
                Care with Confidence
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your doctor reviews your verified history, delegates medication or checks to your care nurse, and you monitor everything in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 3. CARE CIRCLE (DISTINCTIVE CONCEPT) */}
      {/* ---------------------------------------------------- */}
      <section id="care-circle" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Section 3 • Product Concept
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Your Care Circle
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              The Care Circle answers three vital questions in seconds:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                1. "Who is involved in my care?"
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                2. "Who can see my information?"
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                3. "What is happening now?"
              </span>
            </div>
          </div>

          {/* Interactive Care Circle Visual Flow Component */}
          <CareCircleVisual />
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. PRIVATE RECORD SHARING */}
      {/* ---------------------------------------------------- */}
      <section id="sharing" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Section 4
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Private Record Sharing
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Granular consent replaces all-or-nothing medical record disclosure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                11 Granular Clinical Categories
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Share only what is relevant to the care encounter:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">✓ Clinical Encounters</span>
                <span className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">✓ Active Diagnoses</span>
                <span className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">✓ Lab Results</span>
                <span className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">✓ Prescriptions</span>
                <span className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">✓ Vital Signs</span>
                <span className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">✓ Medical Documents</span>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Time-Limited & Instantly Revocable
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Consents automatically expire after the consultation window you select (e.g. 7 days, 30 days, or 1 year). You can also click "Revoke" at any time to immediately withdraw doctor access.
                </p>
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 text-xs text-teal-900">
                <strong className="block font-bold mb-0.5">Strict Rule: No Administrator Bypass</strong>
                <span>Hospital administrators manage accounts and security, but cannot open or inspect private patient clinical records without patient consent.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. AI-ASSISTED RECORDS (FACTUAL & ADVISORY) */}
      {/* ---------------------------------------------------- */}
      <section id="ai-records" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Section 5
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              AI-Assisted Health Records
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Practical automated assistance designed to save clinical time, with medical professionals always in control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">
                <span>📄 Document Extraction</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Automated Lab & Report Extraction
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When lab reports or discharge summaries are uploaded, our document pipeline extracts quantifiable test values (such as Blood Glucose, HbA1c, and Hemoglobin) so clinicians don't have to re-type data manually.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">
                <span>📊 Clinical Decision Support</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                30-Day Readmission Risk Indicator
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trained on standardized clinical benchmarks, the risk engine highlights potential readmission factors (like visit frequency and active medications) to help doctors focus extra follow-up care where it helps most.
              </p>
            </div>
          </div>

          {/* Explicit Safety Notice */}
          <div className="mt-8 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <strong className="font-bold block mb-0.5">Clinical Safety Notice</strong>
              <span>
                ConsentCare AI tools are assistive decision-support aids. They do not replace doctors, make automatic diagnoses, or prescribe medications. All clinical decisions remain strictly with the licensed medical team.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6, 7, 8. FOR PATIENTS, DOCTORS, NURSES */}
      {/* ---------------------------------------------------- */}
      <section id="roles" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Sections 6, 7 & 8 • Role Portals
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Built for Everyone in the Care Journey
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Dedicated, uncluttered workstations tailored to each person's role.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* For Patients */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm mb-4">
                  P
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  For Patients
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>View all your clinical encounters and diagnoses in one place.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Grant or revoke doctor access with a single click.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Upload medical documents for safe storage and automated summaries.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <span>Full access audit trail shows every time a record is viewed.</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/register"
                className="w-full py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs text-center border border-teal-200 transition"
              >
                Create patient account →
              </Link>
            </div>

            {/* For Doctors */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-sm mb-4">
                  MD
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  For Doctors
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Request consent directly from patients for clinical care.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Review verified medical history, vitals, and lab flowsheets.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Delegate care tasks and medication orders to assigned nurses.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Advisory readmission risk scoring for proactive discharge planning.</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/login"
                className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs text-center border border-blue-200 transition"
              >
                Clinician sign in →
              </Link>
            </div>

            {/* For Nurses */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm mb-4">
                  RN
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  For Nurses
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Real-time bedside care task queue ordered by clinical priority.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Log medication administrations: Given, Held, or Refused.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Quickly record patient vital signs into the continuous flowsheet.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>One-tap duty availability status toggle for shift coordination.</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/login"
                className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs text-center border border-emerald-200 transition"
              >
                Nursing staff sign in →
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Clinical staff accounts are created by your healthcare administrator.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* CONTEXTUAL FAQ / HELPFUL QUESTIONS */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
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
                a: "No. Under ConsentCare's zero-trust access model, administrator privileges are strictly operational (managing user accounts, auditing system health, and provisioning staff). Clinical medical charts require patient consent.",
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
              <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-5 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 transition"
                >
                  <span>{item.q}</span>
                  <span className="text-slate-400 font-normal ml-3">
                    {expandedFaq === idx ? "−" : "+"}
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div className="px-5 py-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-200">
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
      <footer className="bg-slate-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div>
              <Logo variant="full" size="md" dark />
              <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
                Patient-Governed Electronic Health Record (EHR) System with zero-trust consent and real-time clinical care team coordination.
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
            <p>© {new Date().getFullYear()} ConsentCare EHR. All rights reserved.</p>
            <p className="text-[11px] text-slate-400">
              Security standard: OWASP ASVS 5.0.0 Verified Baseline • HIPAA-Aware Architecture
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
