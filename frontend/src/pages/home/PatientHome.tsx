import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type Patient,
  type Consent,
  type AccessRequest,
  type Prescription,
  type LabReport,
  type Observation,
  type Doctor,
} from "../../api/client";
import HealthTimeline from "../../components/patient/HealthTimeline";
import DocumentCenter from "../../components/documents/DocumentCenter";
import { triggerHaptic } from "../../utils/haptics";

export default function PatientHome() {
  const { t } = useTranslation();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Active subview: 'home' | 'health' | 'documents' | 'doctors' | 'permissions'
  const [activeView, setActiveView] = useState<"home" | "health" | "documents" | "doctors" | "permissions">("home");

  // Grant Doctor Access Modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [durationHours, setDurationHours] = useState(1);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await api.getMyPatient().catch(() => null);
      setPatient(me);
      if (me) {
        const [cList, reqList, rxList, lrList, obsList, docList] = await Promise.all([
          api.listMyConsents().catch(() => []),
          api.listMyAccessRequests().catch(() => []),
          api.listPrescriptions(me.id).catch(() => []),
          api.listLabReports(me.id).catch(() => []),
          api.listObservations(me.id).catch(() => []),
          api.listDoctors().catch(() => []),
        ]);
        setConsents(cList);
        setAccessRequests(reqList);
        setPrescriptions(rxList);
        setLabReports(lrList);
        setObservations(obsList);
        setDoctors(docList);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevokeConsent = async (consentId: number) => {
    triggerHaptic(10);
    try {
      await api.revokeConsent(consentId);
      const cList = await api.listMyConsents();
      setConsents(cList);
    } catch (err: any) {
      alert(err.message || t("errors.GENERIC"));
    }
  };

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) return;

    setGrantSubmitting(true);
    triggerHaptic(10);
    try {
      const expiresAt = new Date(Date.now() + durationHours * 3600000).toISOString();
      await api.grantConsentsDirectly({
        doctorId: Number(selectedDoctorId),
        categories: ["MEDICAL_HISTORY", "LAB_REPORTS", "PRESCRIPTIONS", "DOCUMENTS", "RISK_ASSESSMENTS"],
        purpose: "Patient initiated clinical access",
        expiresAt,
        durationHours,
      });

      setShowGrantModal(false);
      setSelectedDoctorId("");
      setGrantSuccess(t("consent.revokedNotice") ? "Access granted successfully." : "Access granted.");
      const cList = await api.listMyConsents();
      setConsents(cList);
    } catch (err: any) {
      alert(err.message || t("errors.GENERIC"));
    } finally {
      setGrantSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((d) =>
    doctorSearch ? d.fullName.toLowerCase().includes(doctorSearch.toLowerCase()) || d.specialization.toLowerCase().includes(doctorSearch.toLowerCase()) : true
  );

  const pendingRequests = accessRequests.filter((r) => r.status === "PENDING");
  const activeConsents = consents.filter((c) => c.status === "ACTIVE" && new Date(c.expiresAt).getTime() > Date.now());

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-teal border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-slate-500 mt-3">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {grantSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center justify-between animate-in fade-in">
          <span>✓ {grantSuccess}</span>
          <button
            type="button"
            onClick={() => setGrantSuccess("")}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* View Switcher Header (Breadcrumb when drilled down) */}
      {activeView !== "home" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveView("home");
              triggerHaptic(5);
            }}
            className="text-xs font-semibold text-teal hover:underline flex items-center gap-1"
          >
            <span>← {t("common.actions.back")}</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PRIMARY HOME SCREEN */}
      {/* ========================================================================= */}
      {activeView === "home" && (
        <div className="space-y-8 animate-in fade-in duration-150">
          {/* Greeting Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider block">
              {t("common.appName")}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {t("patient.greetingMorning")}, {patient?.fullName || t("common.roles.patient")} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              {t("patient.howCanWeHelp")}
            </p>
          </div>

          {/* 4 Primary Action Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: My Health */}
            <button
              type="button"
              onClick={() => {
                setActiveView("health");
                triggerHaptic(10);
              }}
              className="btn-tactile text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition space-y-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal flex items-center justify-center text-2xl group-hover:scale-105 transition">
                ❤️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal transition">
                  {t("patient.myHealthTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {t("patient.myHealthDesc")}
                </p>
              </div>
            </button>

            {/* Tile 2: Upload Medical Report */}
            <button
              type="button"
              onClick={() => {
                setActiveView("documents");
                triggerHaptic(10);
              }}
              className="btn-tactile text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition space-y-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                📄
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition">
                  {t("patient.uploadReportTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {t("patient.uploadReportDesc")}
                </p>
              </div>
            </button>

            {/* Tile 3: My Doctors */}
            <button
              type="button"
              onClick={() => {
                setActiveView("doctors");
                triggerHaptic(10);
              }}
              className="btn-tactile text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition space-y-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                👨‍⚕️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 transition">
                  {t("patient.myDoctorsTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {t("patient.myDoctorsDesc")}
                </p>
              </div>
            </button>

            {/* Tile 4: My Permissions */}
            <button
              type="button"
              onClick={() => {
                setActiveView("permissions");
                triggerHaptic(10);
              }}
              className="btn-tactile text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition space-y-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-105 transition">
                🛡️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition">
                  {t("patient.myPermissionsTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {t("patient.myPermissionsDesc")}
                </p>
              </div>
            </button>
          </div>

          {/* "Needs Your Attention" Section (Only actual pending actions) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🔔</span> {t("patient.needsAttention")}
            </h2>

            {pendingRequests.length === 0 && activeConsents.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {t("patient.noPendingActions")}
              </p>
            ) : (
              <div className="space-y-3">
                {/* Pending Doctor Requests */}
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        {req.doctorName} {t("patient.doctorWaitingPermission")}
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                        Categories: {req.requestedCategories?.join(", ") || "Clinical Records"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView("permissions")}
                      className="btn-tactile px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 self-start sm:self-auto"
                    >
                      {t("patient.review")}
                    </button>
                  </div>
                ))}

                {/* Active Consent Expiring Soon */}
                {activeConsents.slice(0, 3).map((c) => {
                  const minutesLeft = Math.max(0, Math.floor((new Date(c.expiresAt).getTime() - Date.now()) / 60000));
                  return (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{c.doctorName}</span>
                        <span className="text-slate-500 ml-2">({c.category})</span>
                      </div>
                      <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                        {t("patient.accessExpiringIn")}: {minutesLeft}m
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-VIEW: MY HEALTH */}
      {/* ========================================================================= */}
      {activeView === "health" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t("patient.healthTimeline")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("patient.healthTimelineDesc")}
            </p>
          </div>

          <HealthTimeline
            encounters={[]}
            diagnoses={[]}
            prescriptions={prescriptions}
            labReports={labReports}
            observations={observations}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-VIEW: UPLOAD MEDICAL REPORT */}
      {/* ========================================================================= */}
      {activeView === "documents" && patient && (
        <div className="animate-in fade-in duration-150">
          <DocumentCenter patientId={patient.id} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-VIEW: MY DOCTORS */}
      {activeView === "doctors" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t("patient.myDoctorsTitle")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("patient.myDoctorsDesc")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowGrantModal(true);
                triggerHaptic(5);
              }}
              className="btn-tactile text-xs font-bold bg-teal hover:bg-teal-dark text-white px-4 py-2.5 rounded-xl transition"
            >
              + {t("patient.grantAccess")}
            </button>
          </div>

          {/* Search Doctors */}
          <input
            type="text"
            placeholder={t("patient.doctorSearchPlaceholder")}
            value={doctorSearch}
            onChange={(e) => setDoctorSearch(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
          />

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2 text-xs"
              >
                <div className="w-10 h-10 rounded-full bg-teal/10 text-teal font-bold flex items-center justify-center text-sm">
                  🩺
                </div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{doc.fullName}</h4>
                <p className="text-slate-500">{doc.specialization} · {doc.departmentName || "General Care"}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoctorId(String(doc.id));
                    setShowGrantModal(true);
                    triggerHaptic(5);
                  }}
                  className="btn-tactile w-full py-1.5 bg-teal text-white rounded-lg font-semibold text-xs mt-2"
                >
                  {t("patient.grantAccess")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-VIEW: MY PERMISSIONS */}
      {activeView === "permissions" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t("patient.myPermissionsTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("consent.subtitle")}
            </p>
          </div>

          {activeConsents.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {t("consent.noActiveConsents")}
            </p>
          ) : (
            <div className="space-y-3">
              {activeConsents.map((c) => (
                <div
                  key={c.id}
                  className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.doctorName}</h4>
                    <p className="text-slate-500">{c.category} · Granted: {new Date(c.grantedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeConsent(c.id)}
                    className="btn-tactile text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  >
                    {t("patient.revokeAccess")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Grant Doctor Access */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">{t("consent.giveAccessTitle")}</h3>
            <form onSubmit={handleGrantSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Select Doctor</label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                >
                  <option value="">Choose a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">{t("consent.durationTitle")}</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800"
                >
                  <option value={1}>{t("consent.durations.oneHour")}</option>
                  <option value={24}>{t("consent.durations.today")}</option>
                  <option value={168}>{t("consent.durations.sevenDays")}</option>
                  <option value={720}>{t("consent.durations.thirtyDays")}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="btn-tactile px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={grantSubmitting}
                  className="btn-tactile px-4 py-2 font-semibold bg-teal text-white rounded-xl hover:bg-teal-dark"
                >
                  {grantSubmitting ? t("common.loading") : t("consent.allowButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
