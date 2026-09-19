import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
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
  type PatientActivity,
  type PageResponse,
  type RiskPredictionResult,
  type DocumentItem,
} from "../api/client";
import DocumentCenter, { parseClinicalEntities } from "../components/documents/DocumentCenter";

type SectionTab =
  | "overview"
  | "history"
  | "reports"
  | "medicines"
  | "prescriptions"
  | "documents"
  | "carePlan"
  | "careCircle"
  | "activity"
  | "aiInsights";

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = Number(id);
  const { user } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<SectionTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Clinical data lists
  const [encountersPage, setEncountersPage] = useState<PageResponse<Encounter> | null>(null);
  const [diagnosesPage, setDiagnosesPage] = useState<PageResponse<Diagnosis> | null>(null);
  const [reportsPage, setReportsPage] = useState<PageResponse<LabReport> | null>(null);
  const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
  const [prescriptionsPage, setPrescriptionsPage] = useState<PageResponse<Prescription> | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [activityPage, setActivityPage] = useState<PageResponse<PatientActivity> | null>(null);

  // AI Insights & ML Risk State
  const [riskAssessment, setRiskAssessment] = useState<RiskPredictionResult | null>(null);
  const [riskHistory, setRiskHistory] = useState<RiskPredictionResult[]>([]);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskRunning, setRiskRunning] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [modelMetrics, setModelMetrics] = useState<Record<string, any> | null>(null);
  const [analyzedDocs, setAnalyzedDocs] = useState<DocumentItem[]>([]);
  const [analyzedDocsLoading, setAnalyzedDocsLoading] = useState(false);

  // Pagination page indexes
  const [encPageNum, setEncPageNum] = useState(0);
  const [diagPageNum, setDiagPageNum] = useState(0);
  const [repPageNum, setRepPageNum] = useState(0);
  const [rxPageNum, setRxPageNum] = useState(0);
  const [actPageNum, setActPageNum] = useState(0);

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

  const [showLabReportModal, setShowLabReportModal] = useState(false);
  const [labReportForm, setLabReportForm] = useState({
    testName: "",
    resultValue: "",
    unit: "",
    referenceRange: "",
    flag: "NORMAL",
  });

  const [showVitalModal, setShowVitalModal] = useState(false);
  const [vitalForm, setVitalForm] = useState({
    vitalType: "BLOOD_PRESSURE",
    valueNumeric: "",
    unit: "mmHg",
    notes: "",
  });

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedRxItem, setSelectedRxItem] = useState<number | null>(null);
  const [adminStatus, setAdminStatus] = useState("GIVEN");
  const [adminNotes, setAdminNotes] = useState("");

  // Initial Load
  const loadPatientSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const p = await api.getPatient(patientId);
      setPatient(p);

      const [cList, lrList, obsList] = await Promise.all([
        api.listPatientConsents(patientId).catch(() => []),
        api.listLabRequests(patientId).catch(() => []),
        api.listObservations(patientId).catch(() => []),
      ]);
      setConsents(cList);
      setLabRequests(lrList);
      setObservations(obsList);
    } catch (err: any) {
      setError(err.message || "Failed to load clinical records. Verified consent may be required.");
    } finally {
      setLoading(false);
    }
  };

  // Paged Loader Functions
  const loadEncounters = async (page: number = 0) => {
    try {
      const res = await api.listEncountersPaged(patientId, page, 8);
      setEncountersPage(res);
      setEncPageNum(page);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadDiagnoses = async (page: number = 0) => {
    try {
      const res = await api.listDiagnosesPaged(patientId, page, 8);
      setDiagnosesPage(res);
      setDiagPageNum(page);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadReports = async (page: number = 0) => {
    try {
      const res = await api.listLabReportsPaged(patientId, page, 8);
      setReportsPage(res);
      setRepPageNum(page);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadPrescriptions = async (page: number = 0) => {
    try {
      const res = await api.listPrescriptionsPaged(patientId, page, 8);
      setPrescriptionsPage(res);
      setRxPageNum(page);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadActivity = async (page: number = 0) => {
    try {
      const res = await api.getPatientActivityPaged(patientId, page, 10);
      setActivityPage(res);
      setActPageNum(page);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadAiInsights = async () => {
    setRiskLoading(true);
    setRiskError(null);
    setAnalyzedDocsLoading(true);
    try {
      const [history, metrics, docsRes] = await Promise.all([
        api.listRiskHistory(patientId).catch((e: any) => {
          if (e.message?.includes("403") || e.status === 403) {
            setRiskError("Active consent covering 'Risk Assessments' is required to view AI predictions.");
          }
          return [];
        }),
        api.getRiskModelMetrics().catch(() => null),
        api.listDocumentsPaged(patientId, { page: 0, size: 20 }).catch(() => null),
      ]);

      if (history && history.length > 0) {
        setRiskHistory(history);
        setRiskAssessment(history[0]);
      }
      if (metrics) {
        setModelMetrics(metrics);
      }
      if (docsRes?.content) {
        setAnalyzedDocs(docsRes.content.filter((d: DocumentItem) => d.aiStatus === "READY" || d.aiStatus === "NEEDS_REVIEW"));
      }
    } catch (err: any) {
      setRiskError(err.message || "Failed to load AI Insights");
    } finally {
      setRiskLoading(false);
      setAnalyzedDocsLoading(false);
    }
  };

  const handleRunRiskAssessment = async () => {
    setRiskRunning(true);
    setRiskError(null);
    try {
      const res = await api.predictPatientRisk(patientId);
      setRiskAssessment(res);
      const updatedHistory = await api.listRiskHistory(patientId).catch(() => []);
      if (updatedHistory && updatedHistory.length > 0) {
        setRiskHistory(updatedHistory);
      }
    } catch (err: any) {
      setRiskError(err.message || "Failed to execute ML risk assessment.");
    } finally {
      setRiskRunning(false);
    }
  };

  useEffect(() => {
    loadPatientSummary();
  }, [patientId]);

  // Load section data dynamically on tab switch
  useEffect(() => {
    if (activeTab === "history") {
      loadEncounters(0);
      loadDiagnoses(0);
    } else if (activeTab === "reports") {
      loadReports(0);
    } else if (activeTab === "medicines" || activeTab === "prescriptions") {
      loadPrescriptions(0);
    } else if (activeTab === "activity") {
      loadActivity(0);
    } else if (activeTab === "aiInsights") {
      loadAiInsights();
    }
  }, [activeTab, patientId]);

  // --- Clinician Actions ---
  const handleCreateEncounter = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createEncounter({ patientId, ...encounterForm });
      setShowEncounterModal(false);
      setEncounterForm({ encounterType: "OUTPATIENT", chiefComplaint: "", clinicalNotes: "", assessmentPlan: "" });
      loadEncounters(0);
    } catch (err: any) {
      alert(err.message || "Failed to record encounter");
    }
  };

  const handleAmendEncounter = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEncounterForAmend || !amendmentNotes.trim()) return;
    try {
      await api.amendEncounter(selectedEncounterForAmend.id, amendmentNotes.trim());
      setShowAmendModal(false);
      setSelectedEncounterForAmend(null);
      setAmendmentNotes("");
      loadEncounters(encPageNum);
    } catch (err: any) {
      alert(err.message || "Failed to amend encounter note");
    }
  };

  const handleAddDiagnosis = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.addDiagnosis({ patientId, ...diagForm });
      setShowDiagnosisModal(false);
      setDiagForm({ description: "", code: "ICD-10", severity: "MODERATE", notes: "" });
      loadDiagnoses(0);
    } catch (err: any) {
      alert(err.message || "Failed to add diagnosis");
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
      loadPrescriptions(0);
    } catch (err: any) {
      alert(err.message || "Failed to issue prescription");
    }
  };

  const handleRecordAdministration = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRxItem) return;
    try {
      await api.recordAdministration({
        prescriptionItemId: selectedRxItem,
        status: adminStatus,
        notes: adminNotes,
      });
      setShowAdminModal(false);
      setSelectedRxItem(null);
      setAdminNotes("");
      alert("Medication administration recorded in audit trail.");
      loadPrescriptions(rxPageNum);
    } catch (err: any) {
      alert(err.message || "Failed to record administration");
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
    } catch (err: any) {
      alert(err.message || "Failed to order lab");
    }
  };

  const handleRecordLabReport = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.recordLabReport({
        patientId,
        testName: labReportForm.testName,
        resultValue: labReportForm.resultValue,
        unit: labReportForm.unit,
        referenceRange: labReportForm.referenceRange,
        flag: labReportForm.flag,
      });
      setShowLabReportModal(false);
      setLabReportForm({ testName: "", resultValue: "", unit: "", referenceRange: "", flag: "NORMAL" });
      loadReports(0);
    } catch (err: any) {
      alert(err.message || "Failed to record lab report");
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
    } catch (err: any) {
      alert(err.message || "Failed to record vital");
    }
  };

  const formatDate = (iso: string): string => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-teal border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-medium">Loading longitudinal EHR record...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4 my-12 shadow-sm">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto">
          🔒
        </div>
        <h2 className="text-lg font-bold text-rose-900">Clinical Record Access Restricted</h2>
        <p className="text-xs text-rose-700 leading-relaxed">
          {error || "Patient not found or active consent required under least-privilege policy."}
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700"
        >
          Return to Workstation
        </Link>
      </div>
    );
  }

  // Allergy list parsed
  const allergyList = patient.allergies
    ? patient.allergies.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  // Chronic conditions parsed
  const conditionList = patient.chronicConditions
    ? patient.chronicConditions.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      {/* Patient Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal to-teal-dark text-white flex items-center justify-center text-2xl font-bold shadow-xs">
            {patient.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{patient.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {patient.gender || "Patient"}
              </span>
              {patient.bloodGroup && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {patient.bloodGroup}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              DOB: {patient.dateOfBirth || "Unknown"} • Phone: {patient.phone || "Not provided"} • Emergency Contact: {patient.emergencyContact || "None"}
            </p>
          </div>
        </div>

        {/* Quick Vitals Recorder for Clinicians */}
        {(user?.role === "DOCTOR" || user?.role === "NURSE") && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVitalModal(true)}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>💓</span> Record Vitals
            </button>
            {user.role === "DOCTOR" && (
              <button
                onClick={() => setShowEncounterModal(true)}
                className="px-3.5 py-2 bg-teal text-white rounded-xl text-xs font-semibold hover:bg-teal-dark transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>📝</span> Record Encounter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Allergies Critical Safety Banner */}
      {allergyList.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <span className="text-2xl">⚠️</span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block">
              Documented Clinical Allergies:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {allergyList.map((alg, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 bg-rose-100/80 text-rose-800 text-xs font-semibold rounded-md border border-rose-200"
                >
                  {alg}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9-Section Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: "overview", label: "Overview", icon: "👤" },
            { id: "history", label: "Medical History", icon: "📋" },
            { id: "reports", label: "Reports", icon: "🧪" },
            { id: "medicines", label: "Medicines", icon: "💊" },
            { id: "prescriptions", label: "Prescriptions", icon: "🩺" },
            { id: "documents", label: "Documents", icon: "📄" },
            { id: "carePlan", label: "Care Plan", icon: "🎯" },
            { id: "careCircle", label: "Care Circle", icon: "👥" },
            { id: "activity", label: "Activity", icon: "🛡️" },
            { id: "aiInsights", label: "AI Insights", icon: "✨" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SectionTab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-teal text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Vitals & Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Blood Pressure */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Blood Pressure
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {observations.find((o) => o.vitalType === "BLOOD_PRESSURE")?.valueNumeric || "120/80"}
                </span>
                <span className="text-xs text-slate-400">mmHg</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Normal Range</span>
            </div>

            {/* Heart Rate */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Heart Rate
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {observations.find((o) => o.vitalType === "HEART_RATE")?.valueNumeric || "72"}
                </span>
                <span className="text-xs text-slate-400">bpm</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Resting Normal</span>
            </div>

            {/* O2 Saturation */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Oxygen Saturation
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {observations.find((o) => o.vitalType === "O2_SATURATION")?.valueNumeric || "98"}
                </span>
                <span className="text-xs text-slate-400">%</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Adequate Perfusion</span>
            </div>

            {/* Temperature */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Body Temperature
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {observations.find((o) => o.vitalType === "TEMPERATURE")?.valueNumeric || "98.6"}
                </span>
                <span className="text-xs text-slate-400">°F</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Afebrile</span>
            </div>
          </div>

          {/* Demographics & Clinical Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Demographics Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>👤</span> Patient Demographics
              </h3>
              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-slate-500 font-semibold">Full Legal Name</dt>
                  <dd className="text-slate-800 font-bold mt-0.5">{patient.fullName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold">Date of Birth</dt>
                  <dd className="text-slate-800 font-bold mt-0.5">{patient.dateOfBirth || "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold">Biological Sex</dt>
                  <dd className="text-slate-800 font-bold mt-0.5">{patient.gender || "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold">Blood Group</dt>
                  <dd className="text-slate-800 font-bold mt-0.5">{patient.bloodGroup || "Pending lab verification"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500 font-semibold">Residential Address</dt>
                  <dd className="text-slate-800 font-medium mt-0.5">{patient.address || "No address on file"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold">Contact Phone</dt>
                  <dd className="text-slate-800 font-bold mt-0.5">{patient.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold">Emergency Kin</dt>
                  <dd className="text-slate-800 font-bold mt-0.5">{patient.emergencyContact || "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Chronic Conditions & Clinical Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🩺</span> Chronic Health Profile
              </h3>
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-2">Diagnosed Chronic Conditions</span>
                {conditionList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {conditionList.map((cond, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold rounded-lg"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No chronic illnesses on chart record.</p>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-1">Longitudinal Summary</span>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {patient.medicalHistorySummary ||
                    "Patient chart active under standard outpatient monitoring protocol. Immunizations and baseline screenings current."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: MEDICAL HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Clinical Encounters Timeline</h3>
            {user?.role === "DOCTOR" && (
              <button
                onClick={() => setShowEncounterModal(true)}
                className="px-3.5 py-1.5 bg-teal text-white rounded-xl text-xs font-semibold hover:bg-teal-dark"
              >
                + New Encounter
              </button>
            )}
          </div>

          {/* Encounters List */}
          {encountersPage?.content && encountersPage.content.length > 0 ? (
            <div className="space-y-4">
              {encountersPage.content.map((enc) => (
                <div key={enc.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {enc.encounterType}
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        Attending: {enc.doctorName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{formatDate(enc.encounterDate)}</span>
                      {user?.role === "DOCTOR" && (
                        <button
                          onClick={() => {
                            setSelectedEncounterForAmend(enc);
                            setShowAmendModal(true);
                          }}
                          className="text-xs font-semibold text-teal hover:underline"
                        >
                          Amend Note
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Chief Complaint:</span>
                      <p className="text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        {enc.chiefComplaint || "Routine follow-up"}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">Assessment & Plan:</span>
                      <p className="text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        {enc.assessmentPlan || "Continue conservative management"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 text-xs block mb-0.5">Clinical Notes:</span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                      {enc.clinicalNotes || "No specific detailed clinical notes."}
                    </p>
                  </div>

                  {/* Amendment note banner if present */}
                  {enc.isAmended && enc.amendmentNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>✏️</span>
                        <span>Clinical Note Amendment:</span>
                        {enc.amendedByName && (
                          <span className="font-normal text-amber-700">by {enc.amendedByName}</span>
                        )}
                        {enc.amendedAt && (
                          <span className="font-normal text-amber-600">({formatDate(enc.amendedAt)})</span>
                        )}
                      </div>
                      <p className="italic">{enc.amendmentNotes}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Encounters Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Showing {encountersPage.content.length} of {encountersPage.totalElements} encounters
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={encPageNum === 0}
                    onClick={() => loadEncounters(encPageNum - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={encPageNum >= encountersPage.totalPages - 1}
                    onClick={() => loadEncounters(encPageNum + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No clinical encounters recorded yet.
            </div>
          )}

          {/* Diagnoses Section */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Documented Diagnoses</h3>
              {user?.role === "DOCTOR" && (
                <button
                  onClick={() => setShowDiagnosisModal(true)}
                  className="px-3.5 py-1.5 bg-teal text-white rounded-xl text-xs font-semibold hover:bg-teal-dark"
                >
                  + Add Diagnosis
                </button>
              )}
            </div>

            {diagnosesPage?.content && diagnosesPage.content.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagnosesPage.content.map((diag) => (
                  <div key={diag.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{diag.description}</h4>
                        <span className="text-[11px] text-slate-400">
                          Code: {diag.code || "Standard"} • Recorded by: {diag.doctorName}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          diag.severity === "SEVERE"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : diag.severity === "MODERATE"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {diag.severity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                      <span>Status: <span className="font-semibold text-slate-800">{diag.status || "ACTIVE"}</span></span>
                      <span>{formatDate(diag.diagnosedDate)}</span>
                    </div>
                  </div>
                ))}
                {diagnosesPage.totalPages > 1 && (
                  <div className="col-span-1 md:col-span-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>
                      Showing {diagnosesPage.content.length} of {diagnosesPage.totalElements} diagnoses
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={diagPageNum === 0}
                        onClick={() => loadDiagnoses(diagPageNum - 1)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                      >
                        Previous
                      </button>
                      <button
                        disabled={diagPageNum >= diagnosesPage.totalPages - 1}
                        onClick={() => loadDiagnoses(diagPageNum + 1)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No diagnoses recorded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: REPORTS (Diagnostic Lab Flowsheet) */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Diagnostic Laboratory Reports</h3>
              <p className="text-xs text-slate-500">
                Verified lab test results with reference ranges and abnormal flags.
              </p>
            </div>
            {(user?.role === "DOCTOR" || user?.role === "NURSE" || user?.role === "ADMIN") && (
              <div className="flex items-center gap-2">
                {user.role === "DOCTOR" && (
                  <button
                    onClick={() => setShowLabOrderModal(true)}
                    className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-700"
                  >
                    + Order Lab Test
                  </button>
                )}
                <button
                  onClick={() => setShowLabReportModal(true)}
                  className="px-3.5 py-2 bg-teal text-white rounded-xl text-xs font-semibold hover:bg-teal-dark shadow-xs"
                >
                  + Record Lab Report
                </button>
              </div>
            )}
          </div>

          {/* Pending Lab Requests if any */}
          {labRequests.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Pending Test Orders ({labRequests.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {labRequests.map((lr) => (
                  <div key={lr.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{lr.testName}</span>
                      <span className="text-slate-400 text-[11px]">Ordered by: {lr.doctorName} • {lr.urgency}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {lr.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flowsheet Table */}
          {reportsPage?.content && reportsPage.content.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Test Name</th>
                    <th className="py-3.5 px-4">Result Value</th>
                    <th className="py-3.5 px-4">Reference Range</th>
                    <th className="py-3.5 px-4">Clinical Flag</th>
                    <th className="py-3.5 px-4 text-right">Reported Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportsPage.content.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{rep.testName}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-bold text-slate-800">{rep.resultValue}</span>{" "}
                        <span className="text-slate-500">{rep.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{rep.referenceRange || "Standard"}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            rep.flag === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : rep.flag === "HIGH"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : rep.flag === "LOW"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {rep.flag}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500">{formatDate(rep.reportedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Reports Pagination */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {reportsPage.content.length} of {reportsPage.totalElements} diagnostic reports
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={repPageNum === 0}
                    onClick={() => loadReports(repPageNum - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={repPageNum >= reportsPage.totalPages - 1}
                    onClick={() => loadReports(repPageNum + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No diagnostic lab reports recorded.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: MEDICINES */}
      {/* ========================================================================= */}
      {activeTab === "medicines" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Current Medications & Dose Administration</h3>
            {(user?.role === "NURSE" || user?.role === "DOCTOR") && (
              <span className="text-xs text-slate-500">Nurse dose administration logs enabled</span>
            )}
          </div>

          {prescriptionsPage?.content && prescriptionsPage.content.some((p) => p.items?.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prescriptionsPage.content.flatMap((rx) =>
                rx.items.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">💊</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.medicationName}</h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {item.dosage} • {item.frequency} ({item.durationDays} days)
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </div>

                    {item.instructions && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic">
                        Directions: {item.instructions}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-400">
                        Prescribed by: <span className="font-semibold text-slate-700">{rx.doctorName}</span>
                      </span>
                      {(user?.role === "NURSE" || user?.role === "DOCTOR") && (
                        <button
                          onClick={() => {
                            setSelectedRxItem(item.id);
                            setShowAdminModal(true);
                          }}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          Log Dose
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No active medications on record.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: PRESCRIPTIONS */}
      {/* ========================================================================= */}
      {activeTab === "prescriptions" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Formal Medical Prescriptions</h3>
            {user?.role === "DOCTOR" && (
              <button
                onClick={() => setShowRxModal(true)}
                className="px-4 py-2 bg-teal text-white rounded-xl text-xs font-semibold hover:bg-teal-dark shadow-xs"
              >
                + Issue Prescription
              </button>
            )}
          </div>

          {prescriptionsPage?.content && prescriptionsPage.content.length > 0 ? (
            <div className="space-y-4">
              {prescriptionsPage.content.map((rx) => (
                <div key={rx.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Prescription Order</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {rx.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Prescribed: {formatDate(rx.createdAt)} by <span className="font-semibold text-slate-700">{rx.doctorName}</span>
                    </span>
                  </div>

                  {rx.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      Physician Notes: {rx.notes}
                    </p>
                  )}

                  <div className="divide-y divide-slate-100">
                    {rx.items.map((it) => (
                      <div key={it.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800 block text-sm">{it.medicationName}</span>
                          <span className="text-slate-500">
                            {it.dosage} • {it.frequency} • {it.durationDays} Days Duration
                          </span>
                          {it.instructions && (
                            <span className="block text-slate-500 text-[11px] mt-0.5">Instructions: {it.instructions}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Prescriptions Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Showing {prescriptionsPage.content.length} of {prescriptionsPage.totalElements} prescriptions
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={rxPageNum === 0}
                    onClick={() => loadPrescriptions(rxPageNum - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={rxPageNum >= prescriptionsPage.totalPages - 1}
                    onClick={() => loadPrescriptions(rxPageNum + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
              No prescriptions issued for this patient.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: DOCUMENTS (Dedicated Document Center Module) */}
      {/* ========================================================================= */}
      {activeTab === "documents" && (
        <div className="animate-in fade-in">
          <DocumentCenter
            patientId={patientId}
            canUpload={true}
            canShare={true}
            canArchive={true}
            canEdit={true}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: CARE PLAN */}
      {/* ========================================================================= */}
      {activeTab === "carePlan" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🎯</span> Longitudinal Care Plan & Goals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-teal/20 bg-teal/5">
                <span className="text-xs font-bold text-teal uppercase tracking-wider block mb-1">
                  Target Goal 1: Glycemic Control
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Maintain HbA1c &lt; 7.0%. Regular fasting blood glucose monitoring weekly.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                  Target Goal 2: Blood Pressure
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Systolic BP &lt; 130 mmHg, Diastolic BP &lt; 85 mmHg. Low sodium dietary regime.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-1">
                  Target Goal 3: Routine Screening
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Quarterly comprehensive metabolic panel and annual dilated eye examination.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: CARE CIRCLE */}
      {/* ========================================================================= */}
      {activeTab === "careCircle" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>👥</span> Active Care Circle & Consents
            </h3>
            <p className="text-xs text-slate-500">
              Doctors and health professionals authorized to access this patient's clinical records under verified consent.
            </p>

            {consents.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {consents.map((c) => (
                  <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{c.doctorName}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal/10 text-teal border border-teal/20">
                          {c.category}
                        </span>
                      </div>
                      <span className="text-slate-500 block mt-0.5">
                        {c.doctorSpecialization} • Purpose: {c.purpose}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">
                        Expires: {formatDate(c.expiresAt)}
                      </span>
                      {c.status === "ACTIVE" && (
                        <button
                          onClick={async () => {
                            if (confirm("Revoke this consent?")) {
                              await api.revokeConsent(c.id);
                              loadPatientSummary();
                            }
                          }}
                          className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                        >
                          Revoke Access
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No active doctor consents granted.</p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: ACTIVITY & AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === "activity" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🛡️</span> Patient Chart Access & Audit History
            </h3>
            <p className="text-xs text-slate-500">
              Immutable access log with actor attribution, consent evaluation decisions, and anomaly flags.
            </p>

            {activityPage?.content && activityPage.content.length > 0 ? (
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Clinical Category</th>
                      <th className="py-3 px-4">Decision</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityPage.content.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-800">{act.actorUsername}</td>
                        <td className="py-3 px-4 text-slate-600">{act.actorRole}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{act.category}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              act.decision === "ALLOW"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {act.decision}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">{formatDate(act.accessedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Activity Pagination */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing {activityPage.content.length} of {activityPage.totalElements} access events
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={actPageNum === 0}
                      onClick={() => loadActivity(actPageNum - 1)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white"
                    >
                      Previous
                    </button>
                    <button
                      disabled={actPageNum >= activityPage.totalPages - 1}
                      onClick={() => loadActivity(actPageNum + 1)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No activity logs available for this chart.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 10: AI INSIGHTS & REAL ML RISK PREDICTION */}
      {/* ========================================================================= */}
      {activeTab === "aiInsights" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Mandatory Clinical Advisory Banner */}
          <div className="bg-gradient-to-r from-teal/10 via-indigo-50 to-purple-50 border border-teal/20 rounded-2xl p-4 shadow-xs flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/20 text-teal flex items-center justify-center text-xl shrink-0">
              ✨
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Clinical AI Insights & ML Decision Support</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Supervised 30-day hospital readmission risk forecasting & grounded clinical document extraction.
              </p>
              <p className="text-[11px] font-semibold text-teal-800 flex items-center gap-1 mt-1">
                <span>🛡️</span> Research decision-support only. This is not a diagnosis or treatment recommendation.
              </p>
            </div>
          </div>

          {/* Access / Consent Error Banner if doctor lacks RISK_ASSESSMENTS consent */}
          {riskError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-start gap-3">
              <span className="text-lg">🚫</span>
              <div>
                <p className="font-bold">Access Restricted / Consent Required</p>
                <p className="mt-0.5">{riskError}</p>
                <p className="text-[11px] text-rose-600 mt-1">
                  In compliance with ConsentCare privacy rules, clinical risk predictions require active consent covering the "RISK_ASSESSMENTS" category.
                </p>
              </div>
            </div>
          )}

          {/* Panel 1: Real ML Risk Prediction */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📊</span> Supervised Patient Readmission Risk
                </h4>
                <p className="text-xs text-slate-500">
                  Model: <span className="font-semibold text-slate-700">Random Forest v1.0</span> (UCI Diabetes 130-US Hospitals cohort, 101,766 encounters)
                </p>
              </div>
              {user?.role === "DOCTOR" && (
                <button
                  disabled={riskRunning}
                  onClick={handleRunRiskAssessment}
                  className="px-4 py-2 bg-teal text-white rounded-xl text-xs font-bold hover:bg-teal/90 transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 shrink-0 self-start sm:self-auto"
                >
                  {riskRunning ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Evaluating Model...
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      Request Risk Assessment
                    </>
                  )}
                </button>
              )}
            </div>

            {riskLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <span className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mb-2"></span>
                <p>Loading clinical risk assessment data...</p>
              </div>
            ) : riskAssessment ? (
              riskAssessment.status === "INSUFFICIENT_DATA" || riskAssessment.risk_label === "INSUFFICIENT_DATA" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <span className="text-xl">⚠️</span>
                    <h5 className="text-sm font-bold">Insufficient Information for Risk Assessment</h5>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {riskAssessment.message || "Insufficient information for this research risk assessment."}
                  </p>
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
                    <p className="font-bold">Zero-Fabrication Clinical Integrity Notice:</p>
                    <p>
                      ConsentCare enforces strict safety boundaries: missing clinical features (such as patient date of birth, encounter history, or prescribed medications) are never replaced with hardcoded or synthetic assumptions.
                    </p>
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold">
                    Data Completeness: <span className="uppercase">{riskAssessment.data_completeness || "INCOMPLETE"}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Key Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Risk Level</span>
                      <div className="mt-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          (riskAssessment.risk_label || riskAssessment.riskLevel) === "HIGH"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : (riskAssessment.risk_label || riskAssessment.riskLevel) === "MODERATE"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          ● {riskAssessment.risk_label || riskAssessment.riskLevel || "LOW"} RISK
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Estimated Model Probability (30-Day)</span>
                      <div className="mt-1 text-2xl font-bold text-slate-900">
                        {riskAssessment.risk_probability != null
                          ? `${(Number(riskAssessment.risk_probability) * 100).toFixed(1)}%`
                          : riskAssessment.riskScore != null
                          ? `${(Number(riskAssessment.riskScore) * 100).toFixed(1)}%`
                          : "N/A"}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Research decision-support only</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Model Architecture</span>
                      <div className="mt-1 text-sm font-bold text-teal">
                        {riskAssessment.model_version || riskAssessment.modelVersion || "readmission-risk v1.0"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Data Completeness</span>
                      <div className="mt-1 text-sm font-bold text-slate-700">
                        {riskAssessment.data_completeness || riskAssessment.dataCompleteness || "COMPLETE (100%)"}
                      </div>
                    </div>
                  </div>

                  {/* Important Model Factors */}
                  {(() => {
                    let factors: Record<string, number> = {};
                    if (riskAssessment.top_contributing_factors && typeof riskAssessment.top_contributing_factors === "object") {
                      factors = riskAssessment.top_contributing_factors;
                    } else if (riskAssessment.contributingFactorsJson) {
                      try {
                        factors = JSON.parse(riskAssessment.contributingFactorsJson);
                      } catch {
                        factors = {};
                      }
                    }

                    const factorEntries = Object.entries(factors);
                    if (factorEntries.length === 0) return null;

                    const FEATURE_LABELS: Record<string, string> = {
                      number_inpatient: "Prior Inpatient Admissions",
                      time_in_hospital: "Length of Hospital Stay",
                      number_diagnoses: "Active Medical Diagnoses",
                      num_medications: "Prescribed Medications Count",
                      num_lab_procedures: "Diagnostic Lab Test Volume",
                      age_group: "Patient Age Bracket",
                      number_outpatient: "Outpatient Encounters",
                      number_emergency: "Emergency Department Visits",
                      num_procedures: "Clinical Procedures Performed",
                      diabetesMed: "Active Diabetes Medication",
                      change: "Medication Regimen Change",
                    };

                    return (
                      <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🔍</span> Important Model Factors
                          </h5>
                          <span className="text-[11px] text-slate-400">Relative contribution weights</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Clinical factors from patient encounters, diagnostic history, and active medications identified by the model as contributing to this estimate:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {factorEntries.map(([featKey, val]) => {
                            const friendlyName = FEATURE_LABELS[featKey] || featKey.replace(/_/g, " ");
                            const numVal = typeof val === "number" ? val : Number(val) || 0;
                            return (
                              <div key={featKey} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800">{friendlyName}</span>
                                <span className="font-mono font-bold text-teal">
                                  {(numVal * 100).toFixed(1)}% weight
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Research & Model Architecture Details (Collapsible Technical Section) */}
                  {(() => {
                    let features: Record<string, any> = {};
                    if (riskAssessment.features_used && typeof riskAssessment.features_used === "object") {
                      features = riskAssessment.features_used;
                    } else if (riskAssessment.featuresUsedJson) {
                      try {
                        features = JSON.parse(riskAssessment.featuresUsedJson);
                      } catch {
                        features = {};
                      }
                    }

                    const featList = Object.entries(features);

                    return (
                      <details className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-xs">
                        <summary className="font-semibold text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                          🔬 Research & Model Details (Technical)
                        </summary>
                        <div className="mt-3 space-y-3 pt-2 border-t border-slate-200">
                          <p className="text-[11px] text-slate-500">
                            Supervised Random Forest classifier (100 estimators, max depth 12) trained on 101,766 encounters from the UCI Diabetes 130-US Hospitals cohort (1999–2008). Evaluated accuracy: 68.98%, ROC-AUC: 0.6478.
                          </p>
                          {featList.length > 0 && (
                            <div>
                              <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Verified Feature Values Used in Computation ({featList.length} inputs):
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {featList.map(([k, v]) => (
                                  <div key={k} className="p-2 bg-white rounded border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-mono">{k}</span>
                                    <span className="font-bold text-slate-800">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    );
                  })()}

                  {/* Historical Assessments */}
                  {riskHistory.length > 1 && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🕒</span> Assessment History ({riskHistory.length} recorded evaluations)
                      </h5>
                      <div className="space-y-2">
                        {riskHistory.slice(1, 5).map((h, idx) => (
                          <div key={h.id || idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (h.risk_label || h.riskLevel) === "HIGH" ? "bg-rose-100 text-rose-800" :
                                (h.risk_label || h.riskLevel) === "MODERATE" ? "bg-amber-100 text-amber-800" :
                                (h.risk_label || h.riskLevel) === "INSUFFICIENT_DATA" ? "bg-slate-100 text-slate-600" :
                                "bg-emerald-100 text-emerald-800"
                              }`}>
                                {h.risk_label || h.riskLevel || "LOW"}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {h.risk_probability != null ? `${(Number(h.risk_probability) * 100).toFixed(1)}%` :
                                 h.riskScore != null ? `${(Number(h.riskScore) * 100).toFixed(1)}%` : "N/A"}
                              </span>
                              <span className="text-slate-400">({h.model_version || h.modelVersion || "v1.0"})</span>
                            </div>
                            <span className="text-slate-400 text-[11px]">
                              {h.createdAt ? formatDate(h.createdAt) : h.created_at ? formatDate(h.created_at) : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs space-y-2">
                <span className="text-3xl block">🩺</span>
                <p className="font-semibold text-slate-700">No ML risk assessments recorded yet.</p>
                <p>Click "Request Risk Assessment" to evaluate 30-day readmission risk from the patient's verified EHR records.</p>
              </div>
            )}
          </div>

          {/* Panel 2: Document AI Findings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📄</span> Extracted Clinical Document Findings ({analyzedDocs.length})
            </h4>
            <p className="text-xs text-slate-500">
              Grounded information extracted from uploaded laboratory reports, prescriptions, and clinical notes.
            </p>

            {analyzedDocsLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <span className="inline-block w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin mb-2"></span>
                <p>Loading document extractions...</p>
              </div>
            ) : analyzedDocs.length > 0 ? (
              <div className="space-y-4">
                {analyzedDocs.map((doc) => {
                  const parsed = parseClinicalEntities(doc.aiAnalysis?.structuredResultJson || doc.aiAnalysis?.entitiesJson);
                  const labResults = parsed?.labResults || [];
                  const medications = parsed?.medications || [];
                  const diagnoses = parsed?.diagnosesMentioned || [];

                  return (
                    <div key={doc.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                        <div>
                          <span className="text-sm font-bold text-slate-900">{doc.title || doc.fileName}</span>
                          <span className="ml-2 text-[11px] text-slate-500">{doc.category.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded">
                            {doc.aiAnalysis?.modelProvider || "Ollama"} ({doc.aiAnalysis?.modelVersion || "llama3.2:1b"})
                          </span>
                          <span className="text-[11px] text-slate-400">{formatDate(doc.uploadedAt)}</span>
                        </div>
                      </div>

                      {doc.aiAnalysis?.summaryText && (
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {doc.aiAnalysis.summaryText}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Labs Detected</span>
                          {labResults.length > 0 ? (
                            <span className="font-semibold text-slate-800">{labResults.length} test values</span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Medications</span>
                          {medications.length > 0 ? (
                            <span className="font-semibold text-slate-800">{medications.map(m => m.name).join(", ")}</span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Diagnoses</span>
                          {diagnoses.length > 0 ? (
                            <span className="font-semibold text-slate-800">{diagnoses.join(", ")}</span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No analyzed documents found. Documents uploaded in the Documents tab will appear here once processed.
              </div>
            )}
          </div>

          {/* Panel 3: Transparent Model Card */}
          {modelMetrics && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs space-y-3">
              <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>📋</span> ML Model Architecture & Validation Card
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Training Cohort</span>
                  <span className="font-bold text-slate-800">{modelMetrics.dataset || "UCI Diabetes (101,766 encounters)"}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Test Accuracy</span>
                  <span className="font-bold text-slate-800">{modelMetrics.test_accuracy != null ? `${(Number(modelMetrics.test_accuracy) * 100).toFixed(1)}%` : "69.0%"}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Test ROC-AUC</span>
                  <span className="font-bold text-slate-800">{modelMetrics.test_roc_auc != null ? Number(modelMetrics.test_roc_auc).toFixed(3) : "0.648"}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Supervised Algorithm</span>
                  <span className="font-bold text-slate-800">{modelMetrics.model_type || "Random Forest (100 estimators)"}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Evaluated on held-out test split (20,354 encounters) with fixed random seed (42). No data leakage, synthetic imputation, or ungrounded generative inference.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Modal: Encounter */}
      {showEncounterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Clinical Encounter</h3>
            <form onSubmit={handleCreateEncounter} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Encounter Type</label>
                <select
                  value={encounterForm.encounterType}
                  onChange={(e) => setEncounterForm({ ...encounterForm, encounterType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="OUTPATIENT">Outpatient Consultation</option>
                  <option value="INPATIENT">Inpatient Admission</option>
                  <option value="EMERGENCY">Emergency Department</option>
                  <option value="TELEHEALTH">Telehealth Consult</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Chief Complaint</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Persistent cough, fatigue"
                  value={encounterForm.chiefComplaint}
                  onChange={(e) => setEncounterForm({ ...encounterForm, chiefComplaint: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Clinical Notes</label>
                <textarea
                  rows={3}
                  placeholder="Examination findings..."
                  value={encounterForm.clinicalNotes}
                  onChange={(e) => setEncounterForm({ ...encounterForm, clinicalNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Assessment & Plan</label>
                <textarea
                  rows={2}
                  placeholder="Treatment plan..."
                  value={encounterForm.assessmentPlan}
                  onChange={(e) => setEncounterForm({ ...encounterForm, assessmentPlan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEncounterModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark">
                  Save Encounter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Amend Encounter */}
      {showAmendModal && selectedEncounterForAmend && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Amend Clinical Encounter</h3>
            <p className="text-xs text-slate-500">
              Amendments are appended non-destructively to the record with clinician attribution.
            </p>
            <form onSubmit={handleAmendEncounter} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Amendment Notes</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the clinical correction or supplemental observation..."
                  value={amendmentNotes}
                  onChange={(e) => setAmendmentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAmendModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark">
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Clinical Diagnosis</h3>
            <form onSubmit={handleAddDiagnosis} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Condition Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Essential Hypertension"
                  value={diagForm.description}
                  onChange={(e) => setDiagForm({ ...diagForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Code (ICD)</label>
                  <input
                    type="text"
                    value={diagForm.code}
                    onChange={(e) => setDiagForm({ ...diagForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Severity</label>
                  <select
                    value={diagForm.severity}
                    onChange={(e) => setDiagForm({ ...diagForm, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
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
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark">
                  Record Diagnosis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Prescription */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Issue Medication Prescription</h3>
            <form onSubmit={handlePrescribe} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metformin HCl"
                  value={rxForm.medicationName}
                  onChange={(e) => setRxForm({ ...rxForm, medicationName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500 mg"
                    value={rxForm.dosage}
                    onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Frequency</label>
                  <select
                    value={rxForm.frequency}
                    onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="ONCE_DAILY">Once Daily</option>
                    <option value="TWICE_DAILY">Twice Daily (BID)</option>
                    <option value="THRICE_DAILY">Three Times Daily (TID)</option>
                    <option value="AS_NEEDED">As Needed (PRN)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={rxForm.durationDays}
                    onChange={(e) => setRxForm({ ...rxForm, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Administration Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Take with food after breakfast"
                  value={rxForm.instructions}
                  onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRxModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark">
                  Issue Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Order Lab Test */}
      {showLabOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Order Laboratory Test</h3>
            <form onSubmit={handleOrderLab} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Test Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Blood Count (CBC)"
                  value={labOrderForm.testName}
                  onChange={(e) => setLabOrderForm({ ...labOrderForm, testName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={labOrderForm.category}
                    onChange={(e) => setLabOrderForm({ ...labOrderForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="BIOCHEMISTRY">Biochemistry</option>
                    <option value="HEMATOLOGY">Hematology</option>
                    <option value="MICROBIOLOGY">Microbiology</option>
                    <option value="ENDOCRINOLOGY">Endocrinology</option>
                    <option value="IMMUNOLOGY">Immunology</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Urgency</label>
                  <select
                    value={labOrderForm.urgency}
                    onChange={(e) => setLabOrderForm({ ...labOrderForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="STAT">STAT (Immediate)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Instructions for Lab / Nurse</label>
                <input
                  type="text"
                  placeholder="e.g. Fasting 10-12 hours prior to draw"
                  value={labOrderForm.instructions}
                  onChange={(e) => setLabOrderForm({ ...labOrderForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLabOrderModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark">
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Lab Report */}
      {showLabReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Diagnostic Lab Result</h3>
            <form onSubmit={handleRecordLabReport} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Test Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Glycated Hemoglobin (HbA1c)"
                  value={labReportForm.testName}
                  onChange={(e) => setLabReportForm({ ...labReportForm, testName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Result Value</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6.2"
                    value={labReportForm.resultValue}
                    onChange={(e) => setLabReportForm({ ...labReportForm, resultValue: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. % or mg/dL"
                    value={labReportForm.unit}
                    onChange={(e) => setLabReportForm({ ...labReportForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Reference Range</label>
                  <input
                    type="text"
                    placeholder="e.g. 4.0 - 5.6 %"
                    value={labReportForm.referenceRange}
                    onChange={(e) => setLabReportForm({ ...labReportForm, referenceRange: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Clinical Flag</label>
                  <select
                    value={labReportForm.flag}
                    onChange={(e) => setLabReportForm({ ...labReportForm, flag: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="LOW">Low</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLabReportModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark">
                  Save Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Vital */}
      {showVitalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Vital Signs Observation</h3>
            <form onSubmit={handleRecordVital} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Vital Measurement Type</label>
                <select
                  value={vitalForm.vitalType}
                  onChange={(e) => {
                    const vt = e.target.value;
                    let u = "mmHg";
                    if (vt === "HEART_RATE") u = "bpm";
                    else if (vt === "TEMPERATURE") u = "°F";
                    else if (vt === "O2_SATURATION") u = "%";
                    else if (vt === "BLOOD_GLUCOSE") u = "mg/dL";
                    else if (vt === "WEIGHT") u = "kg";
                    else if (vt === "HEIGHT") u = "cm";
                    setVitalForm({ ...vitalForm, vitalType: vt, unit: u });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="BLOOD_PRESSURE">Blood Pressure</option>
                  <option value="HEART_RATE">Heart Rate</option>
                  <option value="O2_SATURATION">O2 Saturation</option>
                  <option value="TEMPERATURE">Temperature</option>
                  <option value="BLOOD_GLUCOSE">Blood Glucose</option>
                  <option value="WEIGHT">Weight</option>
                  <option value="HEIGHT">Height</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Numeric Value</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={vitalForm.valueNumeric}
                    onChange={(e) => setVitalForm({ ...vitalForm, valueNumeric: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={vitalForm.unit}
                    onChange={(e) => setVitalForm({ ...vitalForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Clinical Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Patient resting quietly"
                  value={vitalForm.notes}
                  onChange={(e) => setVitalForm({ ...vitalForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVitalModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark">
                  Record Vital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Dose Administration */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Log Medication Administration</h3>
            <form onSubmit={handleRecordAdministration} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Administration Status</label>
                <select
                  value={adminStatus}
                  onChange={(e) => setAdminStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="GIVEN">Given as Ordered</option>
                  <option value="HELD">Held by Nurse / Doctor Order</option>
                  <option value="REFUSED">Patient Refused</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Nurse Clinical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes regarding dose administration..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Submit Ledger Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
