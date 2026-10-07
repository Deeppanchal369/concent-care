import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  api,
  type Patient,
  type Doctor,
  type Nurse,
  type NurseTask,
  type AccessRequest,
} from "../../api/client";
import { triggerHaptic } from "../../utils/haptics";

export default function DoctorHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [careTeamNurses, setCareTeamNurses] = useState<Nurse[]>([]);
  const [doctorTasks, setDoctorTasks] = useState<NurseTask[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Assign Nurse Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskPatientId, setTaskPatientId] = useState<number | "">("");
  const [taskNurseId, setTaskNurseId] = useState<number | "">("");
  const [taskType, setTaskType] = useState("VITALS_CHECK");
  const [taskPriority, setTaskPriority] = useState("ROUTINE");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const doc = await api.getMyDoctorProfile().catch(() => null);
      setDoctor(doc);

      const [pList, nList, tList, reqList] = await Promise.all([
        api.listDoctorPatients().catch(() => []),
        api.listDoctorNurseTeam().catch(() => []),
        api.listDoctorTasks().catch(() => []),
        api.listDoctorAccessRequests().catch(() => []),
      ]);

      setPatients(pList);
      setCareTeamNurses(nList);
      setDoctorTasks(tList);
      setAccessRequests(reqList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter patients by debounced query
  const filteredPatients = useMemo(() => {
    if (!debouncedQuery.trim()) return patients;
    const q = debouncedQuery.toLowerCase().trim();
    return patients.filter((p) => {
      const nameMatch = p.fullName?.toLowerCase().includes(q);
      const phoneMatch = p.phone?.toLowerCase().includes(q);
      const idMatch = String(p.id).includes(q);
      return nameMatch || phoneMatch || idMatch;
    });
  }, [patients, debouncedQuery]);

  // Compute summary stats
  const pendingRequestsCount = accessRequests.filter((r) => r.status === "PENDING").length;
  const activeTasksCount = doctorTasks.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS").length;

  const handleOpenChart = (patientId: number) => {
    triggerHaptic(10);
    navigate(`/patient/${patientId}`);
  };

  const handleOpenTaskModal = (patientId?: number) => {
    triggerHaptic(5);
    if (patientId) {
      setTaskPatientId(patientId);
    } else if (patients.length > 0) {
      setTaskPatientId(patients[0].id);
    }
    if (careTeamNurses.length > 0 && !taskNurseId) {
      setTaskNurseId(careTeamNurses[0].id);
    }
    setShowTaskModal(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !taskPatientId || !taskNurseId || !taskInstructions.trim()) return;

    setTaskSubmitting(true);
    triggerHaptic(10);
    try {
      await api.createNurseTask({
        doctorId: doctor.id,
        nurseId: Number(taskNurseId),
        patientId: Number(taskPatientId),
        taskType,
        priority: taskPriority,
        instructions: taskInstructions.trim(),
        dueTime: taskDueTime ? new Date(taskDueTime).toISOString() : undefined,
      });

      setTaskNotice(t("doctor.createTaskSuccess"));
      setShowTaskModal(false);
      setTaskInstructions("");
      setTaskDueTime("");

      // Refresh tasks
      const updatedTasks = await api.listDoctorTasks().catch(() => []);
      setDoctorTasks(updatedTasks);

      setTimeout(() => setTaskNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || t("errors.GENERIC"));
    } finally {
      setTaskSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-teal border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {taskNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center justify-between animate-in fade-in">
          <span>✓ {taskNotice}</span>
          <button
            type="button"
            onClick={() => setTaskNotice(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 ml-4"
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
              {t("common.appName")} · {t("common.roles.doctor")}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {t("doctor.greeting")} {doctor?.fullName || ""} 🩺
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {doctor?.specialization ? `${doctor.specialization} · ` : ""}{doctor?.departmentName || ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenTaskModal()}
              disabled={careTeamNurses.length === 0 || patients.length === 0}
              className="btn-tactile px-4 py-2.5 rounded-xl bg-teal text-white hover:bg-teal-600 text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>+</span>
              <span>{t("doctor.chart.assignTask")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Today's Work Summary Cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          {t("doctor.todaysWork")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              {t("doctor.patientsNeedingAttention")}
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {pendingRequestsCount}
              </span>
              <span className="text-xs text-amber-600 font-semibold">
                {pendingRequestsCount > 0 ? "Pending access" : "All clear"}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              {t("doctor.pendingTasks")}
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {activeTasksCount}
              </span>
              <span className="text-xs text-teal font-semibold">
                {activeTasksCount > 0 ? "Care-team tasks" : "Zero pending"}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              {t("doctor.myCareTeam")}
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {careTeamNurses.length}
              </span>
              <span className="text-xs text-blue-600 font-semibold">
                {careTeamNurses.length > 0 ? "Allocated nurses" : "None assigned"}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              {t("doctor.healthInsightsCount")}
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {patients.length}
              </span>
              <span className="text-xs text-purple-600 font-semibold">
                Active charts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Search & Directory */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t("doctor.recentPatients")} ({filteredPatients.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("doctor.searchPlaceholder")}
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("doctor.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal"
            />
          </div>
        </div>

        {/* Patient Cards / List */}
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">
              {searchQuery ? t("doctor.noPatientsFound") : t("doctor.noPatientsYet")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-teal/50 hover:shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {p.fullName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {p.gender ? `${p.gender} · ` : ""}{p.dateOfBirth ? `${p.dateOfBirth}` : ""}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      #{p.id}
                    </span>
                  </div>

                  {p.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                      <span>📞</span>
                      <span>{p.phone}</span>
                    </p>
                  )}

                  {p.emergencyContact && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Emergency: {p.emergencyContact}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenChart(p.id)}
                    className="flex-1 btn-tactile py-2 rounded-lg bg-teal text-white hover:bg-teal-600 text-xs font-bold text-center transition cursor-pointer"
                  >
                    {t("doctor.openChart")} →
                  </button>
                  {careTeamNurses.length > 0 && (
                    <button
                      type="button"
                      title={t("doctor.chart.assignTask")}
                      onClick={() => handleOpenTaskModal(p.id)}
                      className="btn-tactile px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Care-Team Tasks Tracker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t("doctor.activeTasks")} ({doctorTasks.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tasks assigned to your care-team nurses
            </p>
          </div>
          {careTeamNurses.length > 0 && patients.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenTaskModal()}
              className="text-xs font-bold text-teal hover:underline cursor-pointer"
            >
              + {t("doctor.chart.assignTask")}
            </button>
          )}
        </div>

        {doctorTasks.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">{t("doctor.noActiveTasks")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">{t("doctor.patientName")}</th>
                  <th className="py-2.5 px-3">{t("doctor.assignedNurse")}</th>
                  <th className="py-2.5 px-3">{t("doctor.drawers.taskType")}</th>
                  <th className="py-2.5 px-3">{t("doctor.priority")}</th>
                  <th className="py-2.5 px-3">{t("doctor.taskStatus")}</th>
                  <th className="py-2.5 px-3">{t("doctor.dueTime")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {doctorTasks.map((tItem) => (
                  <tr key={tItem.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {tItem.patientName || `#${tItem.patientId}`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {tItem.nurseName || `#${tItem.nurseId}`}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {tItem.taskType}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        tItem.priority === "URGENT" || tItem.priority === "STAT"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {tItem.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        tItem.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : tItem.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                      }`}>
                        {tItem.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {tItem.dueTime ? new Date(tItem.dueTime).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Nurse Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {t("doctor.drawers.assignNurseTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              {/* Select Patient */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("doctor.patientName")}
                </label>
                <select
                  value={taskPatientId}
                  onChange={(e) => setTaskPatientId(Number(e.target.value))}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- {t("common.actions.select") || "Select"} --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} (#{p.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Nurse */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("doctor.drawers.selectNurse")}
                </label>
                <select
                  value={taskNurseId}
                  onChange={(e) => setTaskNurseId(Number(e.target.value))}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- {t("doctor.drawers.selectNurse")} --</option>
                  {careTeamNurses.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.fullName} ({n.departmentName || "General"}) — {n.availabilityStatus || "AVAILABLE"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Task Type */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("doctor.drawers.taskType")}
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="VITALS_CHECK">Vitals Check</option>
                    <option value="MEDICATION_ADMIN">Medication Administration</option>
                    <option value="WOUND_DRESSING">Wound Dressing</option>
                    <option value="SAMPLE_COLLECTION">Sample Collection</option>
                    <option value="OBSERVATION">Clinical Observation</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("doctor.priority")}
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="STAT">STAT (Immediate)</option>
                  </select>
                </div>
              </div>

              {/* Due Date/Time */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("doctor.dueTime")} (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={taskDueTime}
                  onChange={(e) => setTaskDueTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("doctor.drawers.taskInstructions")}
                </label>
                <textarea
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Check blood pressure and fasting blood glucose before next dose..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting || !taskInstructions.trim()}
                  className="btn-tactile px-5 py-2 rounded-xl bg-teal text-white hover:bg-teal-600 font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {taskSubmitting ? t("common.loading") : t("common.actions.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
