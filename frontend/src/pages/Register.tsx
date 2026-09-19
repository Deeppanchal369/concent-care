import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { friendlyError } from "../api/errors";
import Logo from "../components/brand/Logo";
import { usePageTitle } from "../hooks/usePageTitle";

interface RegistrationFormData {
  // Step 1: Account
  username: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Step 2: Basic Information
  fullName: string;
  dateOfBirth: string;
  gender: string;

  // Step 3: Contact
  phone: string;
  address: string;
  emergencyContact: string;

  // Step 4: Acknowledgment
  consentAcknowledged: boolean;
}

const INITIAL_FORM: RegistrationFormData = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  dateOfBirth: "1995-01-01",
  gender: "MALE",
  phone: "",
  address: "",
  emergencyContact: "",
  consentAcknowledged: false,
};

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Basic information" },
  { id: 3, label: "Contact" },
  { id: 4, label: "Review" },
];

export default function Register() {
  usePageTitle("Create Account");
  const { register } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<RegistrationFormData>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (key: keyof RegistrationFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  // Step validation before proceeding
  const validateStep = (step: number): boolean => {
    setError("");

    if (step === 1) {
      if (!form.username.trim() || form.username.trim().length < 3) {
        setError("Username must be at least 3 characters.");
        return false;
      }
      if (!form.email.trim() || !form.email.includes("@")) {
        setError("Please enter a valid email address.");
        return false;
      }
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(form.password)) {
        setError("Password must be at least 8 characters and include both a letter and a number.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!form.fullName.trim()) {
        setError("Please provide your legal full name.");
        return false;
      }
      if (!form.dateOfBirth) {
        setError("Please provide your date of birth.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      // Contact fields are optional in backend DTO, but validated if entered
      return true;
    }

    if (step === 4) {
      if (!form.consentAcknowledged) {
        setError("Please acknowledge the ConsentCare patient data governance agreement to complete registration.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep(4)) return;

    setError("");
    setLoading(true);
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between">
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

      {/* Main Registration Card */}
      <div className="max-w-xl w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8">
          {/* Form Header */}
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Patient Portal Setup
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-1">
              Create Your Health Record
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Set up your sovereign profile. You will control who views your health history.
            </p>
          </div>

          {/* Step Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {STEPS.map((s, idx) => {
                const isActive = currentStep === s.id;
                const isCompleted = currentStep > s.id;
                return (
                  <div key={s.id} className="flex-1 flex flex-col items-center relative">
                    {/* Connecting line */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`absolute top-3.5 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                          currentStep > s.id ? "bg-teal-600" : "bg-slate-200"
                        }`}
                      />
                    )}

                    {/* Step circle */}
                    <button
                      type="button"
                      disabled={currentStep < s.id}
                      onClick={() => {
                        if (currentStep > s.id) setCurrentStep(s.id);
                      }}
                      className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isActive
                          ? "bg-teal-700 text-white ring-4 ring-teal-100"
                          : isCompleted
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 text-slate-400 border border-slate-300"
                      }`}
                    >
                      {isCompleted ? "✓" : s.id}
                    </button>
                    <span
                      className={`text-[11px] font-semibold mt-1.5 text-center hidden sm:block ${
                        isActive ? "text-slate-900 font-bold" : "text-slate-500"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-center sm:hidden mt-2 text-xs font-bold text-teal-700">
              Step {currentStep} of 4: {STEPS[currentStep - 1].label}
            </div>
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

          <form onSubmit={handleSubmit} noValidate>
            {/* ---------------------------------------------------- */}
            {/* STEP 1: ACCOUNT */}
            {/* ---------------------------------------------------- */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="reg-username" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Username <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    required
                    placeholder="Choose a username (min. 3 characters)"
                    value={form.username}
                    onChange={(e) => updateField("username", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Used to sign in to your private portal.
                  </span>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    We will send consent notifications and record access alerts here.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Password <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="At least 8 characters"
                        value={form.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-confirm" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Confirm Password <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="reg-confirm"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                  Must be at least 8 characters and include both a letter and a number.
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 2: BASIC INFORMATION */}
            {/* ---------------------------------------------------- */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="reg-fullname" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Legal Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Must match government ID so attending doctors can verify identity.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-dob" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Date of Birth <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="reg-dob"
                      type="date"
                      required
                      value={form.dateOfBirth}
                      onChange={(e) => updateField("dateOfBirth", e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-teal focus:border-teal transition shadow-2xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-gender" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      id="reg-gender"
                      value={form.gender}
                      onChange={(e) => updateField("gender", e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-teal focus:border-teal transition shadow-2xs"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other / Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 3: CONTACT */}
            {/* ---------------------------------------------------- */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    placeholder="+1 (555) 012-3456"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Optional. Used for urgent clinical care notifications.
                  </span>
                </div>

                <div>
                  <label htmlFor="reg-address" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Residential Address
                  </label>
                  <input
                    id="reg-address"
                    type="text"
                    placeholder="Street, City, Postal Code"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs"
                  />
                </div>

                <div>
                  <label htmlFor="reg-emergency" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Emergency Contact Name & Phone
                  </label>
                  <input
                    id="reg-emergency"
                    type="text"
                    placeholder="e.g. Sarah Vance (Sister) - 555-0199"
                    value={form.emergencyContact}
                    onChange={(e) => updateField("emergencyContact", e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-teal focus:border-teal transition shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 4: REVIEW & CONFIRMATION */}
            {/* ---------------------------------------------------- */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-semibold">Account Username:</span>
                    <span className="font-bold text-slate-900">{form.username}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-semibold">Contact Email:</span>
                    <span className="font-bold text-slate-900">{form.email}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-semibold">Full Legal Name:</span>
                    <span className="font-bold text-slate-900">{form.fullName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500 font-semibold">Date of Birth:</span>
                    <span className="font-bold text-slate-900">{form.dateOfBirth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Gender:</span>
                    <span className="font-bold text-slate-900">{form.gender}</span>
                  </div>
                </div>

                <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={form.consentAcknowledged}
                      onChange={(e) => updateField("consentAcknowledged", e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-teal-700 focus:ring-teal-600"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed">
                      I understand that ConsentCare is a patient-governed electronic health record platform. My clinical records will only be accessible to clinicians whom I explicitly authorize.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition focus:outline-teal"
                >
                  ← Previous
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-xs focus:outline-teal"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-60 cursor-pointer flex items-center gap-2 focus:outline-teal"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Creating Patient Profile...</span>
                    </>
                  ) : (
                    <span>Complete Registration & Open Portal</span>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Clinical Staff Onboarding Notice & Login Link */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="text-teal-700 font-bold hover:underline focus:outline-teal">
                Sign in
              </Link>
            </p>
            <p className="text-[11px] text-slate-500">
              Clinical staff accounts are created by your healthcare administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="max-w-xl w-full mx-auto text-center text-xs text-slate-500">
        <p>ConsentCare Electronic Health Record Platform • Privacy by Design</p>
      </div>
    </div>
  );
}
