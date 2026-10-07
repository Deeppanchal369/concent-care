import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Encounter, Diagnosis, Prescription, LabReport, Observation } from "../../api/client";
import { triggerHaptic } from "../../utils/haptics";

interface HealthTimelineProps {
  encounters: Encounter[];
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  labReports: LabReport[];
  observations: Observation[];
  onAmendEncounter?: (enc: Encounter) => void;
  onAdministerRx?: (rxItemId: number) => void;
  isDoctor?: boolean;
  isNurse?: boolean;
}

type EventFilter = "ALL" | "ENCOUNTER" | "DIAGNOSIS" | "LAB" | "MEDICATION" | "VITAL";

interface UnifiedEvent {
  id: string;
  rawDate: string;
  formattedDate: string;
  type: "ENCOUNTER" | "DIAGNOSIS" | "LAB" | "MEDICATION" | "VITAL";
  title: string;
  subtitle?: string;
  details?: string;
  badge?: string;
  badgeColor?: string;
  meta?: any;
}

export default function HealthTimeline({
  encounters,
  diagnoses,
  prescriptions,
  labReports,
  observations,
  onAmendEncounter,
  onAdministerRx,
  isDoctor = false,
  isNurse = false,
}: HealthTimelineProps) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<EventFilter>("ALL");

  const events: UnifiedEvent[] = useMemo(() => {
    const list: UnifiedEvent[] = [];

    // Encounters
    encounters.forEach((enc) => {
      list.push({
        id: `enc-${enc.id}`,
        rawDate: enc.encounterDate,
        formattedDate: new Date(enc.encounterDate).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }),
        type: "ENCOUNTER",
        title: `Doctor Visit: ${enc.encounterType}`,
        subtitle: enc.doctorName ? `Attending: ${enc.doctorName}` : undefined,
        details: enc.chiefComplaint ? `Complaint: ${enc.chiefComplaint}` : enc.clinicalNotes || undefined,
        badge: enc.isAmended ? "Amended" : undefined,
        badgeColor: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300",
        meta: enc,
      });
    });

    // Diagnoses
    diagnoses.forEach((diag) => {
      list.push({
        id: `diag-${diag.id}`,
        rawDate: diag.diagnosedDate,
        formattedDate: new Date(diag.diagnosedDate).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }),
        type: "DIAGNOSIS",
        title: `Diagnosis: ${diag.description}`,
        subtitle: diag.code ? `ICD Code: ${diag.code}` : undefined,
        details: diag.notes || undefined,
        badge: diag.status || diag.severity,
        badgeColor: diag.status === "ACTIVE" ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
        meta: diag,
      });
    });

    // Prescriptions
    prescriptions.forEach((rx) => {
      const medNames = rx.items?.map((i) => `${i.medicationName} (${i.dosage})`).join(", ");
      list.push({
        id: `rx-${rx.id}`,
        rawDate: rx.createdAt,
        formattedDate: new Date(rx.createdAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }),
        type: "MEDICATION",
        title: `Prescription: ${medNames || "Medication Order"}`,
        subtitle: rx.doctorName ? `Prescribed by: ${rx.doctorName}` : undefined,
        details: rx.notes || undefined,
        badge: rx.status || "Active",
        badgeColor: "bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300",
        meta: rx,
      });
    });

    // Lab Reports
    labReports.forEach((rep) => {
      list.push({
        id: `rep-${rep.id}`,
        rawDate: rep.reportedAt,
        formattedDate: new Date(rep.reportedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }),
        type: "LAB",
        title: `Lab Result: ${rep.testName}`,
        subtitle: `Result: ${rep.resultValue} ${rep.unit || ""} (Ref: ${rep.referenceRange || "Standard"})`,
        badge: rep.flag,
        badgeColor:
          rep.flag === "CRITICAL"
            ? "bg-rose-600 text-white"
            : rep.flag === "HIGH" || rep.flag === "LOW"
            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
            : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300",
        meta: rep,
      });
    });

    // Vitals / Observations
    observations.forEach((obs) => {
      list.push({
        id: `obs-${obs.id}`,
        rawDate: obs.observedAt,
        formattedDate: new Date(obs.observedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }),
        type: "VITAL",
        title: `Vital Recorded: ${obs.vitalType.replace(/_/g, " ")}`,
        subtitle: `Value: ${obs.valueNumeric} ${obs.unit}`,
        details: obs.notes || undefined,
        badge: "Observation",
        badgeColor: "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300",
        meta: obs,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  }, [encounters, diagnoses, prescriptions, labReports, observations]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === "ALL") return events;
    return events.filter((e) => e.type === activeFilter);
  }, [events, activeFilter]);

  const getEventIcon = (type: UnifiedEvent["type"]) => {
    switch (type) {
      case "ENCOUNTER": return "🩺";
      case "DIAGNOSIS": return "📋";
      case "MEDICATION": return "💊";
      case "LAB": return "🧪";
      case "VITAL": return "❤️";
      default: return "📄";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Pill Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "ALL", label: t("common.status.active") === "Active" ? "All Records" : "તમામ રેકોર્ડ" },
          { id: "ENCOUNTER", label: t("doctor.sections.overview") === "Overview" ? "Doctor Visits" : "ડૉક્ટર મુલાકાતો" },
          { id: "LAB", label: t("doctor.sections.overview") === "Overview" ? "Lab Tests" : "લેબ પરિણામો" },
          { id: "MEDICATION", label: t("doctor.sections.overview") === "Overview" ? "Medicines" : "દવાઓ" },
          { id: "DIAGNOSIS", label: t("doctor.sections.overview") === "Overview" ? "Diagnoses" : "બીમારીઓ" },
          { id: "VITAL", label: t("doctor.sections.overview") === "Overview" ? "Vitals" : "માપદંડો" },
        ].map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => {
              setActiveFilter(btn.id as EventFilter);
              triggerHaptic(5);
            }}
            className={`btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
              activeFilter === btn.id
                ? "bg-teal text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("common.noData")}
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6 py-2">
          {filteredEvents.map((evt) => (
            <div key={evt.id} className="relative pl-6">
              {/* Timeline Node Point */}
              <div className="absolute -left-3 top-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-teal flex items-center justify-center text-xs shadow-2xs">
                {getEventIcon(evt.type)}
              </div>

              {/* Event Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1.5 transition hover:border-slate-300 dark:hover:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                      {evt.formattedDate}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {evt.title}
                    </h4>
                  </div>
                  {evt.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${evt.badgeColor || "bg-slate-100 text-slate-700"}`}>
                      {evt.badge}
                    </span>
                  )}
                </div>

                {evt.subtitle && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {evt.subtitle}
                  </p>
                )}

                {evt.details && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-1">
                    {evt.details}
                  </p>
                )}

                {/* Contextual Action Buttons */}
                <div className="pt-1 flex items-center gap-2">
                  {evt.type === "ENCOUNTER" && isDoctor && onAmendEncounter && (
                    <button
                      type="button"
                      onClick={() => onAmendEncounter(evt.meta)}
                      className="text-xs font-semibold text-teal hover:text-teal-dark dark:text-teal-400 hover:underline"
                    >
                      {t("doctor.chart.amendEncounter")}
                    </button>
                  )}

                  {evt.type === "MEDICATION" && isNurse && onAdministerRx && evt.meta?.items?.[0] && (
                    <button
                      type="button"
                      onClick={() => onAdministerRx(evt.meta.items[0].id)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Log Administration
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
