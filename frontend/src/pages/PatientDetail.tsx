import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import {
  api,
  type Patient,
  type Consent,
  type Prescription,
  type Encounter,
  type Diagnosis,
  type LabRequest,
  type LabReport,
  type Observation,
  type RiskPredictionResult,
  type LongitudinalClinicalInsights,
} from "../api/client";
import DocumentCenter from "../components/documents/DocumentCenter";
import ClinicalFactReview from "../components/documents/ClinicalFactReview";
import HealthTimeline from "../components/patient/HealthTimeline";
import HealthInsightsSection from "../components/patient/HealthInsightsSection";
import { usePageTitle } from "../hooks/usePageTitle";
import { triggerHaptic } from "../utils/haptics";
import { useNotifications } from "../context/NotificationContext";

type SectionTab = "overview" | "history" | "documents" | "insights";

export default function PatientDetail() {
  const { t, i18n } = useTranslation();
  const { showToast } = useNotifications();
  const { id } = useParams();
  const patientId = Number(id);
  const { user } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<SectionTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  usePageTitle(patient ? `${patient.fullName} | ${t("common.appName")}` : t("doctor.sections.overview"));

  // Clinical data lists
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Timer for consent countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // AI & Risk State
  const [riskAssessment, setRiskAssessment] = useState<RiskPredictionResult | null>(null);
  const [longitudinalInsights, setLongitudinalInsights] = useState<LongitudinalClinicalInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Modal States
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [encounterForm, setEncounterForm] = useState({
    encounterType: "OUTPATIENT",
    chiefComplaint: "",
    clinicalNotes: "",
    assessmentPlan: "",
  });

  const [showAmendModal, setShowAmendModal] = useState(false);
  const [selectedEncounterForAmend, setSelectedEncounterForAmend] = useState<Encounter | null>(null);
  const [amendmentNotes, setAmendmentNotes] = useState("");

  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagForm, setDiagForm] = useState({ description: "", code: "ICD-10", severity: "MODERATE", notes: "" });

  const [showRxModal, setShowRxModal] = useState(false);
  const [rxForm, setRxForm] = useState({
    medicationName: "",
    dosage: "",
    frequency: "DAILY",
    durationDays: 7,
    instructions: "",
    notes: "",
  });

  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const [labOrderForm, setLabOrderForm] = useState({
    testName: "",
    category: "BIOCHEMISTRY",
    urgency: "ROUTINE",
    instructions: "",
  });

  const [showVitalModal, setShowVitalModal] = useState(false);
  const [vitalForm, setVitalForm] = useState({
    vitalType: "BLOOD_PRESSURE",
    valueNumeric: "",
    unit: "mmHg",
    notes: "",
  });

  // Load Patient Clinical Summary
  const loadPatientData = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, encList, diagList, repList, rxList, obsList, cList, lrList] = await Promise.all([
        api.getPatient(patientId),
        api.listEncounters(patientId).catch(() => []),
        api.listDiagnoses(patientId).catch(() => []),
        api.listLabReports(patientId).catch(() => []),
        api.listPrescriptions(patientId).catch(() => []),
        api.listObservations(patientId).catch(() => []),
        api.listPatientConsents(patientId).catch(() => []),
        api.listLabRequests(patientId).catch(() => []),
      ]);

      setPatient(p);
      setEncounters(encList);
      setDiagnoses(diagList);
      setReports(repList);
      setPrescriptions(rxList);
      setObservations(obsList);
      setConsents(cList);
      setLabRequests(lrList);

      // Load existing insights if available
      api.getLatestClinicalInsights(patientId).then((ins) => setLongitudinalInsights(ins)).catch(() => {});
      api.listRiskHistory(patientId).then((hist) => {
        if (hist && hist.length > 0) setRiskAssessment(hist[0]);
      }).catch(() => {});
    } catch (err: any) {
      setError(err.message || t("errors.CONSENT_REQUIRED"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  // Handlers for Clinical Actions
  const handleCreateEncounter = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createEncounter({ patientId, ...encounterForm });
      setShowEncounterModal(false);
      setEncounterForm({ encounterType: "OUTPATIENT", chiefComplaint: "", clinicalNotes: "", assessmentPlan: "" });
      const encList = await api.listEncounters(patientId);
      setEncounters(encList);
      triggerHaptic(10);
      showToast({
        type: "success",
        title: "Encounter Recorded",
        message: "Clinical encounter added to patient record.",
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Encounter Failed",
        message: err.message || t("errors.GENERIC"),
        retry: () => handleCreateEncounter(e),
      });
    }
  };

  const handleAmendEncounter = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterForAmend) return;
    try {
      await api.amendEncounter(selectedEncounterForAmend.id, amendmentNotes);
      setShowAmendModal(false);
      setSelectedEncounterForAmend(null);
      setAmendmentNotes("");
      const encList = await api.listEncounters(patientId);
      setEncounters(encList);
      triggerHaptic(10);
      showToast({
        type: "success",
        title: "Encounter Amended",
        message: "Clinical encounter amendment recorded.",
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Amendment Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  const handleAddDiagnosis = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.addDiagnosis({ patientId, ...diagForm });
      setShowDiagnosisModal(false);
      setDiagForm({ description: "", code: "ICD-10", severity: "MODERATE", notes: "" });
      const diagList = await api.listDiagnoses(patientId);
      setDiagnoses(diagList);
      triggerHaptic(10);
      showToast({
        type: "success",
        title: "Diagnosis Added",
        message: `${diagForm.description} added to problem list.`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Diagnosis Failed",
        message: err.message || t("errors.GENERIC"),
        retry: () => handleAddDiagnosis(e),
      });
    }
  };

  const handlePrescribe = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createPrescription({
        patientId,
        notes: rxForm.notes,
        items: [
          {
            medicationName: rxForm.medicationName,
            dosage: rxForm.dosage,
            frequency: rxForm.frequency,
            durationDays: Number(rxForm.durationDays),
            instructions: rxForm.instructions,
          },
        ],
      });
      setShowRxModal(false);
      setRxForm({ medicationName: "", dosage: "", frequency: "DAILY", durationDays: 7, instructions: "", notes: "" });
      const rxList = await api.listPrescriptions(patientId);
      setPrescriptions(rxList);
      triggerHaptic(10);
      showToast({
        type: "success",
        title: "Prescription Created",
        message: `Prescription for ${rxForm.medicationName} created.`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Prescription Failed",
        message: err.message || t("errors.GENERIC"),
        retry: () => handlePrescribe(e),
      });
    }
  };

  const handleOrderLab = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createLabRequest({ patientId, ...labOrderForm });
      setShowLabOrderModal(false);
      setLabOrderForm({ testName: "", category: "BIOCHEMISTRY", urgency: "ROUTINE", instructions: "" });
      const lrList = await api.listLabRequests(patientId);
      setLabRequests(lrList);
      triggerHaptic(10);
      showToast({
        type: "success",
        title: "Lab Ordered",
        message: `Laboratory test ${labOrderForm.testName} requested.`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Order Failed",
        message: err.message || t("errors.GENERIC"),
        retry: () => handleOrderLab(e),
      });
    }
  };

  const handleRecordVital = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.recordObservation({
        patientId,
        vitalType: vitalForm.vitalType,
        valueNumeric: Number(vitalForm.valueNumeric),
        unit: vitalForm.unit,
        notes: vitalForm.notes,
      });
      setShowVitalModal(false);
      setVitalForm({ vitalType: "BLOOD_PRESSURE", valueNumeric: "", unit: "mmHg", notes: "" });
      const obsList = await api.listObservations(patientId);
      setObservations(obsList);
      triggerHaptic(10);
      showToast({
        type: "success",
        title: "Vital Recorded",
        message: "Observation recorded successfully.",
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Recording Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    triggerHaptic(10);
    try {
      const ins = await api.generateClinicalInsights(patientId, i18n.language);
      setLongitudinalInsights(ins);
      const hist = await api.listRiskHistory(patientId);
      if (hist && hist.length > 0) setRiskAssessment(hist[0]);
      showToast({
        type: "success",
        title: "Insights Updated",
        message: "Health Insights generated successfully.",
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "AI Unavailable",
        message: err.message || t("ai.status.unavailable"),
        retry: handleGenerateInsights,
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  // Active Consent Expiration Calculation
  const activeConsent = consents.find((c) => c.status === "ACTIVE" && new Date(c.expiresAt).getTime() > currentTime);
  const consentExpiresInMinutes = activeConsent
    ? Math.max(0, Math.floor((new Date(activeConsent.expiresAt).getTime() - currentTime) / 60000))
    : null;

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-teal border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-slate-500 mt-3">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-4">
        <span className="text-4xl block">🛡️</span>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("errors.UNAUTHORIZED")}</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">{error || t("errors.PATIENT_NOT_FOUND")}</p>
        <Link to="/dashboard" className="btn-tactile inline-block text-xs font-bold bg-teal text-white px-4 py-2 rounded-xl">
          ← {t("doctor.chart.backToPatients")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Patient Profile Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-teal hover:text-teal-dark dark:text-teal-400 flex items-center gap-1 mb-2"
            >
              <span>← {t("doctor.chart.backToPatients")}</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{patient.fullName}</span>
              {patient.gender && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {patient.gender}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              DOB: {patient.dateOfBirth || "—"} · Phone: {patient.phone || "—"} · Blood Group: {patient.bloodGroup || "—"}
            </p>
          </div>

          {/* Quick Doctor Actions */}
          {user?.role === "DOCTOR" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRxModal(true);
                  triggerHaptic(5);
                }}
                className="btn-tactile text-xs font-bold bg-teal hover:bg-teal-dark text-white px-3.5 py-2 rounded-xl transition shadow-xs"
              >
                + {t("doctor.chart.writePrescription")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLabOrderModal(true);
                  triggerHaptic(5);
                }}
                className="btn-tactile text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl transition"
              >
                + {t("doctor.chart.orderLab")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVitalModal(true);
                  triggerHaptic(5);
                }}
                className="btn-tactile text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl transition"
              >
                + Record Vital
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEncounterModal(true);
                  triggerHaptic(5);
                }}
                className="btn-tactile text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 px-3.5 py-2 rounded-xl transition"
              >
                + Record Visit
              </button>
            </div>
          )}
        </div>

        {/* Consent Countdown Banner (Security Invariant) */}
        {activeConsent && consentExpiresInMinutes !== null && (
          <div className="p-3 bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 rounded-xl flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
            <div className="flex items-center gap-2">
              <span>⏳</span>
              <span>
                {t("doctor.chart.consentExpiresIn")}: <strong>{consentExpiresInMinutes} minutes</strong> (Granted by: {activeConsent.grantedBy || patient.fullName})
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal text-white">
              {activeConsent.category}
            </span>
          </div>
        )}

        {/* Allergy Alert Banner */}
        {patient.allergies && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
            <span>⚠️</span>
            <span>
              <strong>Documented Allergies:</strong> {patient.allergies}
            </span>
          </div>
        )}
      </div>

      {/* 4-Section Primary Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: "overview", label: t("doctor.sections.overview"), icon: "👤" },
            { id: "history", label: t("doctor.sections.history"), icon: "📋" },
            { id: "documents", label: t("doctor.sections.documents"), icon: "📄" },
            { id: "insights", label: t("doctor.sections.insights"), icon: "💡" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as SectionTab);
                triggerHaptic(5);
              }}
              className={`btn-tactile py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "bg-teal text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Vitals Summary Grid (Only real values; "—" when unrecorded) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Blood Pressure</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {observations.find((o) => o.vitalType === "BLOOD_PRESSURE")?.valueNumeric || "—"}
                <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Heart Rate</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {observations.find((o) => o.vitalType === "HEART_RATE")?.valueNumeric || "—"}
                <span className="text-xs font-normal text-slate-400 ml-1">bpm</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">SpO2 Oxygen</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {observations.find((o) => o.vitalType === "O2_SATURATION")?.valueNumeric || "—"}
                <span className="text-xs font-normal text-slate-400 ml-1">%</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Blood Glucose</span>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {observations.find((o) => o.vitalType === "BLOOD_GLUCOSE")?.valueNumeric || "—"}
                <span className="text-xs font-normal text-slate-400 ml-1">mg/dL</span>
              </div>
            </div>
          </div>

          {/* Active Diagnoses & Longitudinal Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>📋</span> {t("doctor.chart.currentIssues")}
                </h3>
                {user?.role === "DOCTOR" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiagnosisModal(true);
                      triggerHaptic(5);
                    }}
                    className="text-xs font-semibold text-teal hover:underline"
                  >
                    + Add Diagnosis
                  </button>
                )}
              </div>

              {diagnoses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No chronic diagnoses documented.</p>
              ) : (
                <div className="space-y-2">
                  {diagnoses.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{d.description}</span>
                        {d.code && <span className="text-slate-400 ml-1.5">({d.code})</span>}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                        {d.status || d.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {labRequests.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Pending Lab Orders ({labRequests.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {labRequests.map((lr) => (
                      <span key={lr.id} className="px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 text-xs font-semibold">
                        {lr.testName} ({lr.urgency})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Active Medications Overview */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>💊</span> {t("doctor.chart.activePrescriptions")}
              </h3>
              {prescriptions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No active prescriptions issued.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {prescriptions.flatMap((p) => p.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{item.medicationName}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                          {item.dosage} · {item.frequency}
                        </span>
                      </div>
                      <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold">
                        {item.durationDays} days
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: HEALTH HISTORY (UNIFIED CHRONOLOGICAL TIMELINE) */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t("doctor.sections.history")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Unified chronological timeline of doctor encounters, diagnostic labs, medications, and vitals.
              </p>
            </div>
          </div>

          <HealthTimeline
            encounters={encounters}
            diagnoses={diagnoses}
            prescriptions={prescriptions}
            labReports={reports}
            observations={observations}
            onAmendEncounter={(enc) => {
              setSelectedEncounterForAmend(enc);
              setAmendmentNotes(enc.clinicalNotes || "");
              setShowAmendModal(true);
            }}
            isDoctor={user?.role === "DOCTOR"}
            isNurse={user?.role === "NURSE"}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: DOCUMENTS */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <DocumentCenter patientId={patientId} />
          <ClinicalFactReview patientId={patientId} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: HEALTH INSIGHTS */}
      {/* ========================================================================= */}
      {activeTab === "insights" && (
        <div className="animate-in fade-in duration-150">
          <HealthInsightsSection
            insights={longitudinalInsights}
            riskAssessment={riskAssessment}
            loading={insightsLoading}
            onGenerate={handleGenerateInsights}
            isDoctor={user?.role === "DOCTOR"}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS */}
      {/* ========================================================================= */}

      {/* Modal: Write Prescription */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">{t("doctor.drawers.newPrescriptionTitle")}</h3>
            <form onSubmit={handlePrescribe} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">{t("doctor.drawers.medication")} *</label>
                <input
                  type="text"
                  required
                  placeholder={t("doctor.drawers.medicationPlaceholder")}
                  value={rxForm.medicationName}
                  onChange={(e) => setRxForm({ ...rxForm, medicationName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">{t("doctor.drawers.dosage")} *</label>
                  <input
                    type="text"
                    required
                    placeholder={t("doctor.drawers.dosagePlaceholder")}
                    value={rxForm.dosage}
                    onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">{t("doctor.drawers.durationDays")} *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rxForm.durationDays}
                    onChange={(e) => setRxForm({ ...rxForm, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">{t("doctor.drawers.instructions")}</label>
                <input
                  type="text"
                  placeholder="e.g. Take with warm water after meals"
                  value={rxForm.instructions}
                  onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRxModal(false)}
                  className="btn-tactile px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t("common.actions.cancel")}
                </button>
                <button type="submit" className="btn-tactile px-4 py-2 font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark">
                  {t("common.actions.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Order Lab Test */}
      {showLabOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">{t("doctor.drawers.orderLabTitle")}</h3>
            <form onSubmit={handleOrderLab} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">{t("doctor.drawers.testName")} *</label>
                <input
                  type="text"
                  required
                  placeholder={t("doctor.drawers.testNamePlaceholder")}
                  value={labOrderForm.testName}
                  onChange={(e) => setLabOrderForm({ ...labOrderForm, testName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">{t("doctor.drawers.instructions")}</label>
                <input
                  type="text"
                  placeholder="e.g. Fasting 10-12 hours prior to draw"
                  value={labOrderForm.instructions}
                  onChange={(e) => setLabOrderForm({ ...labOrderForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLabOrderModal(false)}
                  className="btn-tactile px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t("common.actions.cancel")}
                </button>
                <button type="submit" className="btn-tactile px-4 py-2 font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark">
                  {t("common.actions.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Vital */}
      {showVitalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">{t("nurse.vitals.title")}</h3>
            <form onSubmit={handleRecordVital} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">{t("nurse.vitals.selectVital")}</label>
                <select
                  value={vitalForm.vitalType}
                  onChange={(e) => {
                    const vt = e.target.value;
                    let u = "mmHg";
                    if (vt === "HEART_RATE") u = "bpm";
                    else if (vt === "TEMPERATURE") u = "°F";
                    else if (vt === "O2_SATURATION") u = "%";
                    else if (vt === "BLOOD_GLUCOSE") u = "mg/dL";
                    setVitalForm({ ...vitalForm, vitalType: vt, unit: u });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                >
                  <option value="BLOOD_PRESSURE">{t("nurse.vitals.types.bp")}</option>
                  <option value="HEART_RATE">{t("nurse.vitals.types.pulse")}</option>
                  <option value="TEMPERATURE">{t("nurse.vitals.types.temp")}</option>
                  <option value="O2_SATURATION">{t("nurse.vitals.types.spo2")}</option>
                  <option value="BLOOD_GLUCOSE">{t("nurse.vitals.types.glucose")}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">{t("nurse.vitals.value")} *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={vitalForm.valueNumeric}
                    onChange={(e) => setVitalForm({ ...vitalForm, valueNumeric: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">{t("nurse.vitals.unit")}</label>
                  <input
                    type="text"
                    required
                    value={vitalForm.unit}
                    onChange={(e) => setVitalForm({ ...vitalForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVitalModal(false)}
                  className="btn-tactile px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t("common.actions.cancel")}
                </button>
                <button type="submit" className="btn-tactile px-4 py-2 font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark">
                  {t("common.actions.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Encounter */}
      {showEncounterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">Record Clinical Encounter</h3>
            <form onSubmit={handleCreateEncounter} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Encounter Type</label>
                <select
                  value={encounterForm.encounterType}
                  onChange={(e) => setEncounterForm({ ...encounterForm, encounterType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                >
                  <option value="OUTPATIENT">Outpatient Consultation</option>
                  <option value="FOLLOW_UP">Follow-up Visit</option>
                  <option value="EMERGENCY">Emergency Care</option>
                  <option value="TELEHEALTH">Telehealth Consultation</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Chief Complaint *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Routine hypertension check"
                  value={encounterForm.chiefComplaint}
                  onChange={(e) => setEncounterForm({ ...encounterForm, chiefComplaint: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Clinical Notes</label>
                <textarea
                  rows={3}
                  placeholder="Assessment and clinical observations..."
                  value={encounterForm.clinicalNotes}
                  onChange={(e) => setEncounterForm({ ...encounterForm, clinicalNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEncounterModal(false)}
                  className="btn-tactile px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t("common.actions.cancel")}
                </button>
                <button type="submit" className="btn-tactile px-4 py-2 font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark">
                  {t("common.actions.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Amend Encounter */}
      {showAmendModal && selectedEncounterForAmend && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">{t("doctor.chart.amendEncounter")}</h3>
            <p className="text-xs text-slate-500">
              Original note is permanently retained in the audit log. Your addition will be marked as an amendment.
            </p>
            <form onSubmit={handleAmendEncounter} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Amendment Notes *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Clinical clarification or follow-up note..."
                  value={amendmentNotes}
                  onChange={(e) => setAmendmentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAmendModal(false)}
                  className="btn-tactile px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t("common.actions.cancel")}
                </button>
                <button type="submit" className="btn-tactile px-4 py-2 font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark">
                  Save Amendment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Diagnosis */}
      {showDiagnosisModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">Add Diagnosis</h3>
            <form onSubmit={handleAddDiagnosis} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Diagnosis Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Essential Hypertension"
                  value={diagForm.description}
                  onChange={(e) => setDiagForm({ ...diagForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">ICD Code</label>
                  <input
                    type="text"
                    placeholder="e.g. I10"
                    value={diagForm.code}
                    onChange={(e) => setDiagForm({ ...diagForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Severity</label>
                  <select
                    value={diagForm.severity}
                    onChange={(e) => setDiagForm({ ...diagForm, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                  >
                    <option value="MILD">Mild</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="SEVERE">Severe</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiagnosisModal(false)}
                  className="btn-tactile px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t("common.actions.cancel")}
                </button>
                <button type="submit" className="btn-tactile px-4 py-2 font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark">
                  {t("common.actions.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
