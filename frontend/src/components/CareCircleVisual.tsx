import { useState } from "react";

interface StreamDetail {
  id: "records" | "permissions" | "tasks" | "updates";
  name: "Records" | "Permissions" | "Tasks" | "Updates";
  question: string;
  summary: string;
  patientRole: string;
  doctorRole: string;
  nurseRole: string;
  badgeColor: string;
}

const STREAMS: StreamDetail[] = [
  {
    id: "permissions",
    name: "Permissions",
    question: "Who can see my information?",
    summary: "Patient-directed consent rules dictate who can view sensitive health information with time-limited authorization and instant revocation.",
    patientRole: "Grants or revokes granular access across 11 clinical categories.",
    doctorRole: "Receives time-bound permission for approved categories only.",
    nurseRole: "Accesses records strictly required for assigned bedside tasks.",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
  },
  {
    id: "records",
    name: "Records",
    question: "What information is shared?",
    summary: "Diagnoses, lab test results, medication history, and vitals flow seamlessly between verified care team members without data silos.",
    patientRole: "Retains master ownership of all clinical history and notes.",
    doctorRole: "Reviews longitudinal chart and enters clinical diagnoses.",
    nurseRole: "Views authorized observations and current prescription orders.",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    id: "tasks",
    name: "Tasks",
    question: "What care actions are planned?",
    summary: "Attending physicians assign specific care tasks to available nurses, ensuring clear responsibility for patient care.",
    patientRole: "Sees active care plan and scheduled medication timings.",
    doctorRole: "Delegates medication doses, vital checks, and lab sample collection.",
    nurseRole: "Accepts tasks, documents dose administration, and records vitals.",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "updates",
    name: "Updates",
    question: "What is happening right now?",
    summary: "Every access event, clinical measurement, and medication status change is logged into an immutable ledger and streamed in real time.",
    patientRole: "Receives instant alerts when records are accessed or shared.",
    doctorRole: "Gets notified of abnormal vitals or completed nurse tasks.",
    nurseRole: "Receives immediate notification of newly assigned physician orders.",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
];

export default function CareCircleVisual() {
  const [activeStream, setActiveStream] = useState<StreamDetail["id"]>("permissions");
  const current = STREAMS.find((s) => s.id === activeStream) || STREAMS[0];

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-250 shadow-xs overflow-hidden">
      {/* Visual Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-300 text-xs font-semibold tracking-wide uppercase border border-teal-500/30">
            Care Circle Coordination
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-2 text-white">
            Connected Care, Directed by the Patient
          </h3>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            A real-time coordination loop connecting patients, doctors, and nurses with clear accountability.
          </p>
        </div>

        {/* Question Prompt Badge */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 sm:text-right">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Core Question
          </span>
          <span className="text-sm font-bold text-teal-300">
            {current.question}
          </span>
        </div>
      </div>

      {/* Stream Tabs Selector */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0 mr-1">
          Explore Flow:
        </span>
        {STREAMS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveStream(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap focus:outline-teal ${
              activeStream === s.id
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-250 hover:bg-slate-100"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Main Care Circle Visual Flow Canvas */}
      <div className="p-5 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative">
          {/* 1. Patient Node */}
          <div className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 p-5 relative group hover:border-teal-400 transition shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  P
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    Patient
                  </h4>
                  <span className="text-xs text-teal-700 font-semibold">
                    Record Owner & Authority
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Step 1
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 min-h-[36px]">
              "Who is involved in my care? I choose which doctors can view my records and for what purpose."
            </p>

            <div className="mt-auto pt-3 border-t border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Role in {current.name}:
              </span>
              <p className="text-xs font-medium text-slate-800">
                {current.patientRole}
              </p>
            </div>
          </div>

          {/* Flow Connector Arrow 1 (Desktop) */}
          <div className="hidden lg:flex absolute left-[32%] top-1/2 -translate-y-1/2 z-10 w-8 items-center justify-center pointer-events-none">
            <div className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-500 shadow-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>

          {/* 2. Doctor Node */}
          <div className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 p-5 relative group hover:border-blue-400 transition shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  MD
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    Doctor
                  </h4>
                  <span className="text-xs text-blue-700 font-semibold">
                    Attending Physician
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Step 2
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 min-h-[36px]">
              "Who can see my information? Only active patient consent unlocks clinical charting and orders."
            </p>

            <div className="mt-auto pt-3 border-t border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Role in {current.name}:
              </span>
              <p className="text-xs font-medium text-slate-800">
                {current.doctorRole}
              </p>
            </div>
          </div>

          {/* Flow Connector Arrow 2 (Desktop) */}
          <div className="hidden lg:flex absolute left-[65%] top-1/2 -translate-y-1/2 z-10 w-8 items-center justify-center pointer-events-none">
            <div className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-500 shadow-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>

          {/* 3. Nurse Node */}
          <div className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 p-5 relative group hover:border-emerald-400 transition shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  RN
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    Nurse
                  </h4>
                  <span className="text-xs text-emerald-700 font-semibold">
                    Bedside Care & Execution
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Step 3
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 min-h-[36px]">
              "What is happening now? Medication doses, vital recordings, and clinical observations in real time."
            </p>

            <div className="mt-auto pt-3 border-t border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Role in {current.name}:
              </span>
              <p className="text-xs font-medium text-slate-800">
                {current.nurseRole}
              </p>
            </div>
          </div>
        </div>

        {/* Active Stream Summary Banner */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${current.badgeColor}`}>
              {current.name} Flow
            </span>
            <p className="text-xs sm:text-sm text-slate-700 font-medium">
              {current.summary}
            </p>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs shrink-0">
            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-slate-600 font-semibold">Zero-Trust Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
