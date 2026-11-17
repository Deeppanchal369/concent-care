import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type Nurse,
  type NurseTask,
} from "../../api/client";
import { triggerHaptic } from "../../utils/haptics";

export default function NurseHome() {
  const { t } = useTranslation();

  const [nurse, setNurse] = useState<Nurse | null>(null);
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState<"active" | "all" | "completed">("active");

  // Status updating state
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Complete Task Modal
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completeSubmitting, setCompleteSubmitting] = useState(false);

  // Quick Vitals Modal
  type VitalTypeOption = "BLOOD_PRESSURE" | "HEART_RATE" | "TEMPERATURE" | "O2_SATURATION" | "BLOOD_GLUCOSE";
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsPatientId, setVitalsPatientId] = useState<number | null>(null);
  const [vitalsPatientName, setVitalsPatientName] = useState<string>("");
  const [vitalType, setVitalType] = useState<VitalTypeOption>("BLOOD_PRESSURE");
  const [vitalValue, setVitalValue] = useState<string>("");
  const [vitalUnit, setVitalUnit] = useState<string>("mmHg");
  const [vitalNotes, setVitalNotes] = useState<string>("");
  const [vitalSubmitting, setVitalSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await api.getMyNurseStatus().catch(() => null);
      setNurse(me);

      const tList = await api.listNurseTasks().catch(() => []);
      setTasks(tList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateDutyStatus = async (status: "AVAILABLE" | "BUSY" | "OFF_DUTY") => {
    if (!nurse) return;
    setStatusUpdating(true);
    triggerHaptic(10);
    try {
      await api.setNurseStatus(nurse.id, status);
      setNurse((prev) => (prev ? { ...prev, availabilityStatus: status } : prev));
      setActionNotice(t("common.status." + (status === "AVAILABLE" ? "available" : status === "BUSY" ? "busy" : "offDuty")));
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || t("errors.GENERIC"));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string, notes?: string) => {
    triggerHaptic(10);
    try {
      const updated = await api.updateNurseTaskStatus(taskId, newStatus, notes);
      setTasks((prev) => prev.map((item) => (item.id === taskId ? updated : item)));
      setActionNotice(t("nurse.tasks.taskCompleted"));
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || t("errors.GENERIC"));
    }
  };

  const handleStartTask = (taskId: number) => {
    handleUpdateTaskStatus(taskId, "IN_PROGRESS");
  };

  const handleAcceptTask = (taskId: number) => {
    handleUpdateTaskStatus(taskId, "ACCEPTED");
  };

  const handleOpenCompleteModal = (taskId: number) => {
    setCompletingTaskId(taskId);
    setCompletionNotes("");
  };

  const handleSubmitCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTaskId) return;

    setCompleteSubmitting(true);
    triggerHaptic(10);
    try {
      await handleUpdateTaskStatus(completingTaskId, "COMPLETED", completionNotes.trim());
      setCompletingTaskId(null);
      setCompletionNotes("");
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleOpenVitalsModal = (patientId: number, patientName?: string) => {
    setVitalsPatientId(patientId);
    setVitalsPatientName(patientName || `#${patientId}`);
    setVitalType("BLOOD_PRESSURE");
    setVitalValue("");
    setVitalUnit("mmHg");
    setVitalNotes("");
    setShowVitalsModal(true);
    triggerHaptic(5);
  };

  const handleVitalTypeChange = (type: VitalTypeOption) => {
    setVitalType(type);
    if (type === "BLOOD_PRESSURE") setVitalUnit("mmHg");
    else if (type === "HEART_RATE") setVitalUnit("bpm");
    else if (type === "TEMPERATURE") setVitalUnit("°F");
    else if (type === "O2_SATURATION") setVitalUnit("%");
    else if (type === "BLOOD_GLUCOSE") setVitalUnit("mg/dL");
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalsPatientId || !vitalValue) return;

    setVitalSubmitting(true);
    triggerHaptic(10);
    try {
      await api.recordObservation({
        patientId: vitalsPatientId,
        vitalType,
        valueNumeric: parseFloat(vitalValue),
        unit: vitalUnit,
        notes: vitalNotes.trim() || undefined,
      });

      setShowVitalsModal(false);
      setActionNotice(t("nurse.vitals.save") + " ✓");
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || t("errors.GENERIC"));
    } finally {
      setVitalSubmitting(false);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (taskFilter === "active") {
      return tasks.filter((t) => t.status === "ASSIGNED" || t.status === "ACCEPTED" || t.status === "IN_PROGRESS");
    }
    if (taskFilter === "completed") {
      return tasks.filter((t) => t.status === "COMPLETED");
    }
    return tasks;
  }, [tasks, taskFilter]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-teal border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{t("common.loading")}</p>
      </div>
    );
  }

  const currentStatus = nurse?.availabilityStatus || "AVAILABLE";

  return (
    <div className="space-y-6">
      {/* Action Notification */}
      {actionNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center justify-between animate-in fade-in">
          <span>✓ {actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider block">
              {t("common.appName")} · {t("common.roles.nurse")}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {nurse?.fullName || t("common.roles.nurse")} 👩‍⚕️
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {nurse?.departmentName || "General Nursing Station"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              currentStatus === "AVAILABLE"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : currentStatus === "BUSY"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}>
              ● {t("common.status." + (currentStatus === "AVAILABLE" ? "available" : currentStatus === "BUSY" ? "busy" : "offDuty"))}
            </span>
          </div>
        </div>
      </div>

      {/* Duty Status Selector Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t("nurse.availability.title")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set your current availability status for care-team doctors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Available */}
          <button
            type="button"
            disabled={statusUpdating}
            onClick={() => handleUpdateDutyStatus("AVAILABLE")}
            className={`btn-tactile p-4 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
              currentStatus === "AVAILABLE"
                ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-400/50"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  {t("nurse.availability.available")}
                </span>
                {currentStatus === "AVAILABLE" && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✓ Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t("nurse.availability.availableSubtitle")}
              </p>
            </div>
          </button>

          {/* Option 2: Busy */}
          <button
            type="button"
            disabled={statusUpdating}
            onClick={() => handleUpdateDutyStatus("BUSY")}
            className={`btn-tactile p-4 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
              currentStatus === "BUSY"
                ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-2 ring-amber-400/50"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  {t("nurse.availability.busy")}
                </span>
                {currentStatus === "BUSY" && (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">✓ Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t("nurse.availability.busySubtitle")}
              </p>
            </div>
          </button>

          {/* Option 3: Off Duty */}
          <button
            type="button"
            disabled={statusUpdating}
            onClick={() => handleUpdateDutyStatus("OFF_DUTY")}
            className={`btn-tactile p-4 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
              currentStatus === "OFF_DUTY"
                ? "border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/90 ring-2 ring-slate-400/50"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                  {t("nurse.availability.offDuty")}
                </span>
                {currentStatus === "OFF_DUTY" && (
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">✓ Active</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t("nurse.availability.offDutySubtitle")}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Task Queue Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t("nurse.todaysWork")} ({filteredTasks.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assigned patient care tasks and actions
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTaskFilter("active");
                triggerHaptic(5);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                taskFilter === "active"
                  ? "bg-white dark:bg-slate-900 text-teal shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Active ({tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTaskFilter("completed");
                triggerHaptic(5);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                taskFilter === "completed"
                  ? "bg-white dark:bg-slate-900 text-teal shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Completed ({tasks.filter((t) => t.status === "COMPLETED").length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTaskFilter("all");
                triggerHaptic(5);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                taskFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-teal shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All ({tasks.length})
            </button>
          </div>
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">{t("nurse.tasks.noTasks")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 hover:border-teal/40 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {task.patientName ? `${task.patientName}` : `Patient #${task.patientId}`}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-mono">
                      #{task.patientId}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      task.priority === "URGENT" || task.priority === "STAT"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      task.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : task.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 dark:text-slate-400">
                    {task.dueTime ? `Due: ${new Date(task.dueTime).toLocaleString()}` : ""}
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
                  <span className="font-bold block text-slate-700 dark:text-slate-200 mb-0.5">
                    {task.taskType}:
                  </span>
                  {task.instructions}
                </div>

                {task.completionNotes && (
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
                    <span className="font-bold">Completion Notes: </span>
                    {task.completionNotes}
                  </div>
                )}

                {/* Workflow Actions */}
                <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-slate-400">
                    {t("nurse.tasks.assignedBy")}: {task.doctorName ? (task.doctorName.startsWith("Dr.") ? task.doctorName : `Dr. ${task.doctorName}`) : `#${task.doctorId}`}
                  </span>

                  <div className="flex items-center gap-2">
                    {task.status === "ASSIGNED" && (
                      <button
                        type="button"
                        onClick={() => handleAcceptTask(task.id)}
                        className="btn-tactile px-3.5 py-1.5 rounded-lg bg-teal text-white hover:bg-teal-600 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        {t("nurse.tasks.accept")}
                      </button>
                    )}

                    {task.status === "ACCEPTED" && (
                      <button
                        type="button"
                        onClick={() => handleStartTask(task.id)}
                        className="btn-tactile px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        {t("nurse.tasks.start")}
                      </button>
                    )}

                    {task.status === "IN_PROGRESS" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenVitalsModal(task.patientId, task.patientName)}
                          className="btn-tactile px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                        >
                          💓 {t("nurse.tasks.recordVitals")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCompleteModal(task.id)}
                          className="btn-tactile px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-xs cursor-pointer"
                        >
                          ✓ {t("nurse.tasks.complete")}
                        </button>
                      </>
                    )}

                    {task.status === "COMPLETED" && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Task Modal */}
      {completingTaskId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {t("nurse.tasks.complete")}
              </h3>
              <button
                type="button"
                onClick={() => setCompletingTaskId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCompleteTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Completion Observations & Notes
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Vitals checked, patient resting comfortably..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompletingTaskId(null)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={completeSubmitting}
                  className="btn-tactile px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {completeSubmitting ? t("common.loading") : t("nurse.tasks.complete")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Record Vitals Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {t("nurse.vitals.title")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {vitalsPatientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVitalsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-4 text-xs">
              {/* Vital Type */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("nurse.vitals.selectVital")}
                </label>
                <select
                  value={vitalType}
                  onChange={(e) => handleVitalTypeChange(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="BLOOD_PRESSURE">{t("nurse.vitals.types.bp")}</option>
                  <option value="HEART_RATE">{t("nurse.vitals.types.pulse")}</option>
                  <option value="TEMPERATURE">{t("nurse.vitals.types.temp")}</option>
                  <option value="O2_SATURATION">{t("nurse.vitals.types.spo2")}</option>
                  <option value="BLOOD_GLUCOSE">{t("nurse.vitals.types.glucose")}</option>
                </select>
              </div>

              {/* Value and Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("nurse.vitals.value")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={vitalValue}
                    onChange={(e) => setVitalValue(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("nurse.vitals.unit")}
                  </label>
                  <input
                    type="text"
                    value={vitalUnit}
                    onChange={(e) => setVitalUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("nurse.vitals.notes")}
                </label>
                <textarea
                  value={vitalNotes}
                  onChange={(e) => setVitalNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Resting sitting position, left arm..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVitalsModal(false)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={vitalSubmitting || !vitalValue}
                  className="btn-tactile px-5 py-2 rounded-xl bg-teal text-white hover:bg-teal-600 font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {vitalSubmitting ? t("common.loading") : t("nurse.vitals.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
