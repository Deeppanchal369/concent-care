import { useState } from "react";
import { useTranslation } from "react-i18next";
import { triggerHaptic } from "../utils/haptics";

export type FlowStreamId = "permissions" | "records" | "tasks" | "updates";

interface StreamConfig {
  id: FlowStreamId;
  colorClass: {
    activeBadge: string;
    borderAccent: string;
  };
}

const STREAM_CONFIGS: StreamConfig[] = [
  {
    id: "permissions",
    colorClass: {
      activeBadge: "bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      borderAccent: "border-teal-500/40",
    },
  },
  {
    id: "records",
    colorClass: {
      activeBadge: "bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      borderAccent: "border-blue-500/40",
    },
  },
  {
    id: "tasks",
    colorClass: {
      activeBadge: "bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      borderAccent: "border-amber-500/40",
    },
  },
  {
    id: "updates",
    colorClass: {
      activeBadge: "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      borderAccent: "border-emerald-500/40",
    },
  },
];

export default function CareCircleVisual() {
  const { t } = useTranslation();
  const [activeStream, setActiveStream] = useState<FlowStreamId>("permissions");

  const currentCfg = STREAM_CONFIGS.find((s) => s.id === activeStream) || STREAM_CONFIGS[0];

  const handleTabClick = (id: FlowStreamId) => {
    triggerHaptic(5);
    setActiveStream(id);
  };

  const streamName = t(`careCircle.streams.${activeStream}.name`, "Permissions Flow");
  const streamQuestion = t(`careCircle.streams.${activeStream}.question`, "Who can see my information?");
  const streamSummary = t(`careCircle.streams.${activeStream}.summary`, "Patient-directed consent rules dictate who can view sensitive health information with time-limited authorization and instant revocation.");
  const patientRoleInFlow = t(`careCircle.streams.${activeStream}.patientRole`, "Grants or revokes granular access across clinical categories.");
  const doctorRoleInFlow = t(`careCircle.streams.${activeStream}.doctorRole`, "Receives time-bound permission for approved categories only.");
  const nurseRoleInFlow = t(`careCircle.streams.${activeStream}.nurseRole`, "Accesses records strictly required for assigned bedside tasks.");

  return (
    <div className="w-full space-y-6">
      {/* Compact Healthcare Hero Panel */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 text-[11px] font-bold tracking-wide uppercase border border-teal-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              {t("careCircle.heroBadge", "Care Coordination")}
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {t("careCircle.heroTitle", "Connected Care, Directed by the Patient")}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t("careCircle.heroSubtitle", "A real-time coordination loop connecting patients, doctors, and nurses with clear accountability.")}
            </p>
          </div>

          {/* Subdued Core Question Indicator */}
          <div className="lg:text-right shrink-0 bg-slate-800/80 dark:bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 max-w-md">
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
              {t("careCircle.coreQuestionLabel", "Core Question")}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-100">
              "{streamQuestion}"
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Flow Navigation Bar */}
      <div className="bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto p-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2.5 shrink-0 hidden md:inline">
            {t("careCircle.exploreFlow", "Explore Flow:")}
          </span>
          {STREAM_CONFIGS.map((s) => {
            const isActive = activeStream === s.id;
            const tabName = t(`careCircle.streams.${s.id}.name`, s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleTabClick(s.id)}
                className={`btn-tactile px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none ${
                  isActive
                    ? "bg-teal text-white shadow-xs font-extrabold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80"
                }`}
                aria-pressed={isActive}
              >
                {tabName}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-3 py-1 text-slate-500 dark:text-slate-400 text-xs shrink-0 self-end sm:self-auto">
          <svg className="w-4 h-4 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t("careCircle.consentProtected", "Consent Protected")}
          </span>
        </div>
      </div>

      {/* 3-Column Role Canvas with Balanced Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative">
        {/* 1. Patient Role Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-teal-500/50 transition">
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-black text-sm shadow-2xs">
                  P
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {t("careCircle.patient.title", "Patient")}
                  </h4>
                  <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                    {t("careCircle.patient.roleTag", "Center of Care / Owns permissions")}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {t("careCircle.step1", "Step 1")}
              </span>
            </div>

            {/* Role Summary */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {t("careCircle.patient.summary", "Retains master ownership of all records and authorizes clinical access.")}
            </p>

            {/* Core Responsibilities Bullet Points */}
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {(t("careCircle.patient.bullets", {
                returnObjects: true,
                defaultValue: [
                  "Authorizes or revokes granular access by category",
                  "Sets strict expiration windows for consultations",
                  "Reviews real-time audit ledger of all record views",
                ],
              }) as string[]).map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-teal font-bold shrink-0">✓</span>
                  <span className="leading-tight">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Role in Active Flow */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/40 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block mb-1">
              {t("careCircle.roleInFlow", { flow: streamName, defaultValue: `Role in ${streamName}:` })}
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {patientRoleInFlow}
            </p>
          </div>
        </div>

        {/* Subtle Flow Connector Arrow 1 (Desktop) */}
        <div className="hidden lg:flex absolute left-[32.5%] top-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-400 shadow-2xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>

        {/* 2. Doctor Role Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-blue-500/50 transition">
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-black text-sm shadow-2xs">
                  MD
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {t("careCircle.doctor.title", "Doctor")}
                  </h4>
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    {t("careCircle.doctor.roleTag", "Clinical Decision Maker / Requests records")}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {t("careCircle.step2", "Step 2")}
              </span>
            </div>

            {/* Role Summary */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {t("careCircle.doctor.summary", "Requests specific category access and enters verified diagnoses.")}
            </p>

            {/* Core Responsibilities Bullet Points */}
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {(t("careCircle.doctor.bullets", {
                returnObjects: true,
                defaultValue: [
                  "Submits consent requests with explicit clinical purpose",
                  "Reviews longitudinal history and diagnostic labs",
                  "Delegates medication orders and vital checks to nurses",
                ],
              }) as string[]).map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0">✓</span>
                  <span className="leading-tight">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Role in Active Flow */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/40 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block mb-1">
              {t("careCircle.roleInFlow", { flow: streamName, defaultValue: `Role in ${streamName}:` })}
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {doctorRoleInFlow}
            </p>
          </div>
        </div>

        {/* Subtle Flow Connector Arrow 2 (Desktop) */}
        <div className="hidden lg:flex absolute left-[65.8%] top-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-400 shadow-2xs">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </div>

        {/* 3. Nurse Role Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:border-emerald-500/50 transition">
          <div className="space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-black text-sm shadow-2xs">
                  RN
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {t("careCircle.nurse.title", "Nurse")}
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    {t("careCircle.nurse.roleTag", "Care Coordinator / Supports tasks")}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {t("careCircle.step3", "Step 3")}
              </span>
            </div>

            {/* Role Summary */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {t("careCircle.nurse.summary", "Coordinates bedside care, documents vitals, and executes orders.")}
            </p>

            {/* Core Responsibilities Bullet Points */}
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {(t("careCircle.nurse.bullets", {
                returnObjects: true,
                defaultValue: [
                  "Accepts and executes prioritized bedside care tasks",
                  "Documents medication administrations in real time",
                  "Maintains continuous vitals flowsheet with instant alerts",
                ],
              }) as string[]).map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span className="leading-tight">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Role in Active Flow */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/40 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              {t("careCircle.roleInFlow", { flow: streamName, defaultValue: `Role in ${streamName}:` })}
            </span>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {nurseRoleInFlow}
            </p>
          </div>
        </div>
      </div>

      {/* Active Flow Summary Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${currentCfg.colorClass.activeBadge}`}>
            {streamName}
          </span>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
            {streamSummary}
          </p>
        </div>
      </div>
    </div>
  );
}
