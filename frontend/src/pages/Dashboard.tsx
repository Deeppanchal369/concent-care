import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  api,
  type Patient,
  type Consent,
  type AccessRequest,
  type NurseTask,
  type Nurse,
  type Doctor,
  type Prescription,
  type LabReport,
  type Observation,
  type PageResponse,
} from "../api/client";
import DocumentCenter from "../components/documents/DocumentCenter";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Please sign in to access your clinical workstation.</p>
        <Link to="/login" className="mt-4 inline-block bg-teal text-white px-5 py-2 rounded-lg">
          Sign In
        </Link>
      </div>
    );
  }

  if (user.role === "DOCTOR") {
    return <DoctorWorkstation />;
  } else if (user.role === "NURSE") {
    return <NurseWorkstation />;
  } else if (user.role === "PATIENT") {
    return <PatientPortal />;
  } else if (user.role === "ADMIN") {
    navigate("/admin");
    return null;
  }

  return <div>Unknown role</div>;
}

// =========================================================================
// 1. DOCTOR WORKSTATION
// =========================================================================
function DoctorWorkstation() {
  const [patientsPage, setPatientsPage] = useState<PageResponse<Patient> | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPageNum, setPatientPageNum] = useState(0);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [teamNurses, setTeamNurses] = useState<Nurse[]>([]);
  const [activeTab, setActiveTab] = useState<"patients" | "requests" | "nurses" | "tasks">("patients");
  const [loading, setLoading] = useState(true);

  // Access Request Approval Duration mapping
  const [requestDurations, setRequestDurations] = useState<{ [id: number]: number }>({});

  // Delegate Nurse Task Modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskPatientId, setTaskPatientId] = useState("");
  const [taskNurseId, setTaskNurseId] = useState("");
  const [taskType, setTaskType] = useState("VITAL_CHECK");
  const [taskPriority, setTaskPriority] = useState("ROUTINE");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskError, setTaskError] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Load Doctor Data
  const loadPatients = async (page: number = 0, query?: string) => {
    try {
      const res = await api.listDoctorPatientsPaged(page, 8, query || undefined);
      setPatientsPage(res);
      setPatientPageNum(page);
    } catch {
      setPatientsPage({
        content: [],
        pageNumber: 0,
        pageSize: 8,
        totalElements: 0,
        totalPages: 0,
        isFirst: true,
        isLast: true,
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, taskList, nurseList] = await Promise.all([
        api.listDoctorAccessRequests().catch(() => []),
        api.listDoctorTasks().catch(() => []),
        api.listDoctorNurseTeam().catch(() => []),
      ]);
      setAccessRequests(reqList);
      setTasks(taskList);
      setTeamNurses(nurseList);
      await loadPatients(0, patientSearch);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatients(0, patientSearch);
  };

  const handleRespondRequest = async (requestId: number, status: "APPROVED" | "REJECTED") => {
    const duration = requestDurations[requestId] || 30;
    try {
      await api.respondAccessRequest(requestId, status, duration);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to process access request");
    }
  };

  const handleOpenTaskModalForNurse = (nurseId: number) => {
    setTaskNurseId(String(nurseId));
    setTaskError("");
    setShowTaskModal(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPatientId || !taskNurseId || !taskInstructions.trim()) {
      setTaskError("Please fill all required fields.");
      return;
    }

    setTaskSubmitting(true);
    setTaskError("");

    try {
      const meDoc = await api.getMyDoctorProfile();
      if (!meDoc) {
        throw new Error("Doctor profile not found");
      }

      await api.createNurseTask({
        doctorId: meDoc.id,
        nurseId: Number(taskNurseId),
        patientId: Number(taskPatientId),
        taskType,
        instructions: taskInstructions.trim(),
        priority: taskPriority,
      });

      setShowTaskModal(false);
      setTaskPatientId("");
      setTaskNurseId("");
      setTaskInstructions("");
      await loadData();
    } catch (err: any) {
      setTaskError(err.message || "Failed to assign nurse task.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  const pendingRequestsCount = accessRequests.filter((r) => r.status === "PENDING").length;
  const availableNursesCount = teamNurses.filter((n) => n.availabilityStatus === "AVAILABLE").length;
  const activeTasksCount = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Clinical Station</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Doctor Care Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Access consented patient electronic health records, coordinate care teams, and delegate clinical orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTaskError("");
              setShowTaskModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            + Delegate Nurse Task
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Authorized Patients</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {patientsPage ? patientsPage.totalElements : 0}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Active patient consents</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Pending Requests</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingRequestsCount}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Awaiting your approval</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Care Team Nurses</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{teamNurses.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {availableNursesCount} Available now
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Active Delegated Tasks</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{activeTasksCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">{tasks.length} total tasks assigned</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("patients")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "patients"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          My Patients ({patientsPage ? patientsPage.totalElements : 0})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === "requests"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Pending Access Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {pendingRequestsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("nurses")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "nurses"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Care Team Nurses ({teamNurses.length})
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "tasks"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Delegated Tasks ({tasks.length})
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading workstation records...</div>
      ) : activeTab === "patients" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Authorized Patient Cohort</h3>
              <p className="text-xs text-slate-500">
                Patients who have granted you active medical consent. Revoked or expired consents are excluded.
              </p>
            </div>
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search patient name..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs w-48 focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Search
              </button>
              {patientSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setPatientSearch("");
                    loadPatients(0, "");
                  }}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {!patientsPage || patientsPage.content.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No patients found with active consent. When patients authorize access, they will appear in your clinical list.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {patientsPage.content.map((p) => (
                <div key={p.id} className="py-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0 border border-blue-100">
                      {p.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{p.fullName}</span>
                        {p.bloodGroup && (
                          <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">
                            {p.bloodGroup}
                          </span>
                        )}
                        {p.allergies && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                            ⚠️ Allergies: {p.allergies}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>DOB: {p.dateOfBirth || "Unknown"}</span>
                        <span>Gender: {p.gender || "Unknown"}</span>
                        {p.chronicConditions && (
                          <span className="text-slate-600 font-medium">Conditions: {p.chronicConditions}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTaskPatientId(String(p.id));
                        setTaskError("");
                        setShowTaskModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                    >
                      + Delegate Task
                    </button>
                    <Link
                      to={`/patient/${p.id}`}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                    >
                      Open Clinical Chart →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {patientsPage && patientsPage.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Showing Page {patientsPage.pageNumber + 1} of {patientsPage.totalPages} ({patientsPage.totalElements} patients)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={patientsPage.isFirst}
                  onClick={() => loadPatients(patientPageNum - 1, patientSearch)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={patientsPage.isLast}
                  onClick={() => loadPatients(patientPageNum + 1, patientSearch)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "requests" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pending Access Requests</h3>
              <p className="text-xs text-slate-500">
                Patients requesting clinical care and authorization from you. Review and approve or decline.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              {pendingRequestsCount} Action Required
            </span>
          </div>
          {accessRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No access requests received.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accessRequests.map((r) => (
                <div key={r.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{r.patientName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-xs text-slate-500">Requested Categories:</span>
                      {r.requestedCategories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100"
                        >
                          {cat.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    {r.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{r.notes}"
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block">
                      Requested on {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {r.status === "PENDING" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={requestDurations[r.id] || 30}
                        onChange={(e) =>
                          setRequestDurations({ ...requestDurations, [r.id]: Number(e.target.value) })
                        }
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value={7}>7 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={90}>90 Days</option>
                        <option value={365}>1 Year</option>
                      </select>
                      <button
                        onClick={() => handleRespondRequest(r.id, "APPROVED")}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        ✓ Approve Access
                      </button>
                      <button
                        onClick={() => handleRespondRequest(r.id, "REJECTED")}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-xs font-medium transition"
                      >
                        Decline
                      </button>
                    </div>
                  ) : r.status === "APPROVED" ? (
                    <Link
                      to={`/patient/${r.patientId}`}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition"
                    >
                      Open Chart →
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "nurses" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Care Team Nurses</h3>
              <p className="text-xs text-slate-500">
                Nurses formally assigned to your care team. Concurrency safety ensures only AVAILABLE nurses receive new assignments.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {availableNursesCount} Available for Assignment
            </span>
          </div>
          {teamNurses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No nurses currently assigned to your care team. Hospital administrators assign nurses to doctor teams.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {teamNurses.map((n) => (
                <div key={n.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal/10 text-teal font-bold flex items-center justify-center text-sm shrink-0 border border-teal/20">
                      {n.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{n.fullName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            n.availabilityStatus === "AVAILABLE"
                              ? "bg-emerald-100 text-emerald-800"
                              : n.availabilityStatus === "BUSY"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              n.availabilityStatus === "AVAILABLE"
                                ? "bg-emerald-500 animate-pulse"
                                : n.availabilityStatus === "BUSY"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {n.availabilityStatus}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Department: {n.departmentName || "General Ward"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.availabilityStatus === "AVAILABLE" ? (
                      <button
                        onClick={() => handleOpenTaskModalForNurse(n.id)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                      >
                        + Assign Task
                      </button>
                    ) : (
                      <span className="text-xs text-amber-700 font-medium px-3 py-1 bg-amber-50 rounded-lg border border-amber-100">
                        Busy with duties
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Delegated Team Tasks</h3>
              <p className="text-xs text-slate-500">Lifecycle tracking of all clinical tasks delegated to your nurse team.</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {activeTasksCount} Active Duties
            </span>
          </div>
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No delegated nurse tasks on record.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <div key={t.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{t.taskType.replace(/_/g, " ")}</span>
                      <span className="text-xs font-semibold text-slate-600">for {t.patientName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.priority === "EMERGENCY"
                            ? "bg-rose-100 text-rose-800"
                            : t.priority === "URGENT"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : t.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : t.status === "ACCEPTED"
                            ? "bg-indigo-100 text-indigo-800"
                            : t.status === "CANCELLED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">{t.instructions}</p>
                    {t.completionNotes && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                        <span className="font-bold">Completion Notes:</span> {t.completionNotes}
                      </p>
                    )}
                    {t.cancellationReason && (
                      <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100">
                        <span className="font-bold">Cancellation Reason:</span> {t.cancellationReason}
                      </p>
                    )}
                    <div className="text-[10px] text-slate-400 flex items-center gap-3">
                      <span>Assigned to Nurse: <span className="font-semibold text-slate-600">{t.nurseName}</span></span>
                      <span>Assigned: {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {t.completedAt && (
                        <span>Completed: {new Date(t.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/patient/${t.patientId}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                    >
                      View Chart →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delegate Nurse Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Delegate Task to Care Team Nurse</h3>
            <p className="text-xs text-slate-500">
              Only authorized patients and available care team nurses can be assigned. Pessimistic locking prevents double-assigning busy nurses.
            </p>

            {taskError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {taskError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Consented Patient *</label>
                <select
                  required
                  value={taskPatientId}
                  onChange={(e) => setTaskPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Choose an authorized patient...</option>
                  {patientsPage?.content.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} (ID: {p.id}) {p.bloodGroup ? `· ${p.bloodGroup}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Care Team Nurse *</label>
                <select
                  required
                  value={taskNurseId}
                  onChange={(e) => setTaskNurseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Select a care team nurse...</option>
                  {teamNurses.map((n) => (
                    <option key={n.id} value={n.id} disabled={n.availabilityStatus === "BUSY"}>
                      {n.fullName} — [{n.availabilityStatus}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="VITAL_CHECK">Vital Signs Check</option>
                    <option value="MEDICATION_ADMINISTRATION">Medication Administration</option>
                    <option value="SAMPLE_COLLECTION">Sample Collection</option>
                    <option value="PATIENT_ROUNDS">Patient Rounds</option>
                    <option value="WOUND_DRESSING">Wound Dressing</option>
                    <option value="PATIENT_EDUCATION">Patient Education</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Emergency / STAT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Clinical Instructions *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specific bedside instructions for the nurse..."
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={taskSubmitting}
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {taskSubmitting ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 2. NURSE WORKSTATION
// =========================================================================
function NurseWorkstation() {
  const [nurse, setNurse] = useState<Nurse | null>(null);
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"ACTIVE" | "COMPLETED" | "ALL">("ACTIVE");

  // Completion Modal
  const [completingTask, setCompletingTask] = useState<NurseTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionSubmitting, setCompletionSubmitting] = useState(false);

  // Cancellation Modal
  const [cancellingTask, setCancellingTask] = useState<NurseTask | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Quick vital modal state
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [vitalPatientId, setVitalPatientId] = useState("");
  const [vitalType, setVitalType] = useState("BLOOD_PRESSURE");
  const [vitalValue, setVitalValue] = useState("");
  const [vitalUnit, setVitalUnit] = useState("mmHg");
  const [vitalNotes, setVitalNotes] = useState("");

  const loadNurseData = async () => {
    setLoading(true);
    try {
      const [nurseProfile, tList] = await Promise.all([
        api.getMyNurseStatus().catch(() => null),
        api.listNurseTasks().catch(() => []),
      ]);
      setNurse(nurseProfile);
      setTasks(tList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNurseData();
  }, []);

  const handleToggleStatus = async (newStatus: "AVAILABLE" | "BUSY") => {
    if (!nurse) return;
    try {
      await api.setNurseStatus(nurse.id, newStatus);
      await loadNurseData();
    } catch (err: any) {
      alert(err.message || "Failed to update availability status");
    }
  };

  const handleUpdateStatus = async (taskId: number, status: string, notes?: string) => {
    try {
      await api.updateNurseTaskStatus(taskId, status, notes);
      await loadNurseData();
    } catch (err: any) {
      alert(err.message || `Failed to transition task to ${status}`);
    }
  };

  const handleConfirmComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    setCompletionSubmitting(true);
    try {
      await api.updateNurseTaskStatus(completingTask.id, "COMPLETED", completionNotes.trim());
      setCompletingTask(null);
      setCompletionNotes("");
      await loadNurseData();
    } catch (err: any) {
      alert(err.message || "Failed to complete task");
    } finally {
      setCompletionSubmitting(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTask) return;
    setCancelSubmitting(true);
    try {
      await api.updateNurseTaskStatus(cancellingTask.id, "CANCELLED", cancellationReason.trim());
      setCancellingTask(null);
      setCancellationReason("");
      await loadNurseData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel task");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleRecordVital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalPatientId || !vitalValue) return;
    try {
      await api.recordObservation({
        patientId: Number(vitalPatientId),
        vitalType,
        valueNumeric: Number(vitalValue),
        unit: vitalUnit,
        notes: vitalNotes,
      });
      setShowVitalModal(false);
      setVitalValue("");
      setVitalNotes("");
      alert("Vital sign recorded in patient chart.");
    } catch (err: any) {
      alert(err.message || "Failed to record vital sign");
    }
  };

  // Prioritized task queue: EMERGENCY > URGENT > ROUTINE, then ASSIGNED > ACCEPTED > IN_PROGRESS
  const sortedTasks = useMemo(() => {
    const priorityWeight: { [k: string]: number } = { EMERGENCY: 3, URGENT: 2, ROUTINE: 1 };
    const statusWeight: { [k: string]: number } = { ASSIGNED: 4, ACCEPTED: 3, IN_PROGRESS: 2, COMPLETED: 1, CANCELLED: 0 };

    return [...tasks].sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const sDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
      if (sDiff !== 0) return sDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks]);

  const filteredTasks = sortedTasks.filter((t) => {
    if (activeFilter === "ACTIVE") return t.status !== "COMPLETED" && t.status !== "CANCELLED";
    if (activeFilter === "COMPLETED") return t.status === "COMPLETED" || t.status === "CANCELLED";
    return true;
  });

  const activeCount = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const emergencyCount = tasks.filter((t) => t.priority === "EMERGENCY" && t.status !== "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* Availability Status Banner */}
      <div
        className={`border rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
          nurse?.availabilityStatus === "AVAILABLE"
            ? "bg-emerald-50/50 border-emerald-200"
            : "bg-amber-50/50 border-amber-200"
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                nurse?.availabilityStatus === "AVAILABLE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Station Availability: <span className="font-extrabold">{nurse?.availabilityStatus || "AVAILABLE"}</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Welcome, Nurse {nurse?.fullName || "Caregiver"}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {nurse?.availabilityStatus === "AVAILABLE"
              ? "You are marked AVAILABLE to receive new task assignments from attending physicians."
              : "You are currently marked BUSY with active clinical duties. When all tasks are completed, your status automatically reverts to AVAILABLE."}
          </p>
        </div>

        {/* Explicit Availability Control Buttons */}
        <div className="flex items-center gap-2">
          {nurse?.availabilityStatus === "BUSY" ? (
            <button
              onClick={() => handleToggleStatus("AVAILABLE")}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              ✓ Mark as Available
            </button>
          ) : (
            <button
              onClick={() => handleToggleStatus("BUSY")}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              ⏸ Mark as Busy
            </button>
          )}
          <button
            onClick={() => setShowVitalModal(true)}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold transition"
          >
            + Record Vitals
          </button>
        </div>
      </div>

      {/* Nurse Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Active Assigned Duties</span>
          <div className="text-2xl font-black text-blue-600 mt-0.5">{activeCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Prioritized clinical queue</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Completed Duties</span>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">{completedCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Successfully fulfilled orders</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Emergency / STAT Orders</span>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{emergencyCount}</div>
          <div className="text-[11px] text-rose-600 mt-1">Requires immediate attention</div>
        </div>
      </div>

      {/* Task Queue Section: "What do I need to do now?" */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">What Do I Need To Do Now? (Task Queue)</h3>
            <p className="text-xs text-slate-500">
              Prioritized clinical workflow from attending physicians. Includes bedside patient safety context.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter("ACTIVE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeFilter === "ACTIVE"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setActiveFilter("COMPLETED")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeFilter === "COMPLETED"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeFilter === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All ({tasks.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading task queue...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No duties found in this view. You will be notified in real-time when new doctor orders arrive.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((t) => (
              <div key={t.id} className="p-5 hover:bg-slate-50/60 transition space-y-3">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      {t.taskType.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        t.priority === "EMERGENCY"
                          ? "bg-rose-100 text-rose-800 animate-pulse"
                          : t.priority === "URGENT"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : t.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : t.status === "ACCEPTED"
                          ? "bg-indigo-100 text-indigo-800"
                          : t.status === "CANCELLED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      Status: {t.status}
                    </span>
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {t.status === "ASSIGNED" && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, "ACCEPTED")}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        ✓ Accept Task
                      </button>
                    )}
                    {t.status === "ACCEPTED" && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, "IN_PROGRESS")}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        ▶ Start Work
                      </button>
                    )}
                    {t.status === "IN_PROGRESS" && (
                      <>
                        <button
                          onClick={() => {
                            setCompletingTask(t);
                            setCompletionNotes("");
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          ✓ Complete Duty
                        </button>
                        <button
                          onClick={() => {
                            setCancellingTask(t);
                            setCancellationReason("");
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-xs font-medium transition"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <Link
                      to={`/patient/${t.patientId}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                    >
                      View Chart →
                    </Link>
                  </div>
                </div>

                {/* Minimum Necessary Bedside Patient Safety Context */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Patient:</span>{" "}
                    <span className="font-bold text-slate-900">{t.patientName}</span>
                  </div>
                  {(t.patientAge || t.patientGender) && (
                    <div>
                      <span className="text-slate-500 font-medium">Demographics:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {t.patientAge ? `${t.patientAge} yrs` : ""} {t.patientGender ? `· ${t.patientGender}` : ""}
                      </span>
                    </div>
                  )}
                  {t.bloodGroup && (
                    <div className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold border border-rose-100">
                      <span>🩸 Blood Group:</span>
                      <span>{t.bloodGroup}</span>
                    </div>
                  )}
                  {t.allergies && (
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200">
                      <span>⚠️ Allergies:</span>
                      <span>{t.allergies}</span>
                    </div>
                  )}
                  {t.emergencyContact && (
                    <div>
                      <span className="text-slate-500 font-medium">Emergency Contact:</span>{" "}
                      <span className="font-semibold text-slate-800">{t.emergencyContact}</span>
                    </div>
                  )}
                </div>

                {/* Doctor's Clinical Instructions */}
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-medium">Attending Physician Orders:</div>
                  <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 font-medium">
                    {t.instructions}
                  </p>
                </div>

                {/* Completed / Cancelled metadata */}
                {t.completionNotes && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <span className="font-bold">Completion Notes:</span> {t.completionNotes}
                  </div>
                )}
                {t.cancellationReason && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100">
                    <span className="font-bold">Cancellation Reason:</span> {t.cancellationReason}
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-4 pt-1">
                  <span>Assigned by Dr. {t.doctorName}</span>
                  <span>Received: {new Date(t.createdAt).toLocaleString()}</span>
                  {t.acceptedAt && <span>Accepted: {new Date(t.acceptedAt).toLocaleTimeString()}</span>}
                  {t.startedAt && <span>Started: {new Date(t.startedAt).toLocaleTimeString()}</span>}
                  {t.completedAt && <span>Completed: {new Date(t.completedAt).toLocaleTimeString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {completingTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Complete Clinical Duty</h3>
            <p className="text-xs text-slate-500">
              Document bedside execution findings, vitals recorded, or patient response. This will be recorded in the patient chart.
            </p>
            <form onSubmit={handleConfirmComplete} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Execution Notes *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Vitals measured (BP 120/80, HR 72). Medication administered as prescribed. Patient resting comfortably."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={completionSubmitting}
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completionSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {completionSubmitting ? "Completing..." : "Confirm Completion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Cancel Task Assignment</h3>
            <p className="text-xs text-slate-500">State the clinical rationale for cancelling this task assignment.</p>
            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Cancellation *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Patient discharged / order superseded by attending physician."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={cancelSubmitting}
                  onClick={() => setCancellingTask(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {cancelSubmitting ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Vital Modal */}
      {showVitalModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Patient Vital Sign</h3>
            <form onSubmit={handleRecordVital} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Patient ID *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1"
                  value={vitalPatientId}
                  onChange={(e) => setVitalPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Vital Type</label>
                  <select
                    value={vitalType}
                    onChange={(e) => {
                      setVitalType(e.target.value);
                      if (e.target.value === "BLOOD_PRESSURE") setVitalUnit("mmHg");
                      else if (e.target.value === "HEART_RATE") setVitalUnit("bpm");
                      else if (e.target.value === "TEMPERATURE") setVitalUnit("F");
                      else if (e.target.value === "OXYGEN_SATURATION") setVitalUnit("%");
                      else if (e.target.value === "GLUCOSE") setVitalUnit("mg/dL");
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="BLOOD_PRESSURE">Blood Pressure</option>
                    <option value="HEART_RATE">Heart Rate</option>
                    <option value="TEMPERATURE">Body Temp</option>
                    <option value="OXYGEN_SATURATION">SpO2</option>
                    <option value="GLUCOSE">Blood Glucose</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Numeric Value *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 120"
                    value={vitalValue}
                    onChange={(e) => setVitalValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Clinical Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Patient resting comfortably"
                  value={vitalNotes}
                  onChange={(e) => setVitalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVitalModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Save Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 3. PATIENT PORTAL
// =========================================================================
const ALL_CONSENT_CATEGORIES = [
  { id: "MEDICAL_HISTORY", label: "Medical History", desc: "Longitudinal health profile & past medical background" },
  { id: "LAB_REPORTS", label: "Lab Reports", desc: "Diagnostic lab test results and panel values" },
  { id: "PRESCRIPTIONS", label: "Prescriptions", desc: "Active and past medication prescriptions" },
  { id: "MEDICATIONS", label: "Medication Admin", desc: "Recorded medication administrations" },
  { id: "DOCUMENTS", label: "Documents", desc: "Uploaded clinical records and files" },
  { id: "DIAGNOSES", label: "Diagnoses", desc: "Active problem list and medical conditions" },
  { id: "CLINICAL_NOTES", label: "Clinical Notes", desc: "Physician encounter notes and consultation summaries" },
  { id: "IMAGING_REPORTS", label: "Imaging Reports", desc: "Radiology, X-ray, and scan findings" },
  { id: "AI_SUMMARIES", label: "AI Summaries", desc: "Automated clinical document summaries" },
  { id: "RISK_ASSESSMENTS", label: "Risk Assessments", desc: "Clinical readmission and risk model assessments" },
];

function PatientPortal() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [activeTab, setActiveTab] = useState<"consents" | "requests" | "prescriptions" | "labs" | "documents">("consents");
  const [loading, setLoading] = useState(true);

  // Find Doctor & Share Records Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "MEDICAL_HISTORY",
    "LAB_REPORTS",
    "PRESCRIPTIONS",
    "DOCUMENTS",
  ]);
  const [shareDurationDays, setShareDurationDays] = useState("30");
  const [shareNotes, setShareNotes] = useState("");
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState("");

  // Stop Sharing Confirmation Modal State
  const [stopDoctorTarget, setStopDoctorTarget] = useState<{ doctorId: number; doctorName: string } | null>(null);
  const [stopSubmitting, setStopSubmitting] = useState(false);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const me = await api.getMyPatient().catch(() => null);
      setPatient(me);
      if (me) {
        const [cList, reqList, rxList, labList, obsList, docList] = await Promise.all([
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
        setLabReports(labList);
        setObservations(obsList);
        setAvailableDoctors(docList);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, []);

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === ALL_CONSENT_CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(ALL_CONSENT_CATEGORIES.map((c) => c.id));
    }
  };

  const handleSendAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setShareError("Please select a physician to share records with.");
      return;
    }
    if (selectedCategories.length === 0) {
      setShareError("Please select at least one record category to authorize.");
      return;
    }

    setShareSubmitting(true);
    setShareError("");

    try {
      await api.requestAccess({
        doctorId: Number(selectedDoctorId),
        categories: selectedCategories,
        notes: shareNotes.trim() || "Patient initiated clinical record sharing",
        durationDays: Number(shareDurationDays),
      });

      setShowShareModal(false);
      setSelectedDoctorId("");
      setShareNotes("");
      await loadPatientData();
      setActiveTab("requests");
    } catch (err: any) {
      setShareError(err.message || "Failed to send access request.");
    } finally {
      setShareSubmitting(false);
    }
  };

  const handleConfirmStopSharing = async () => {
    if (!stopDoctorTarget) return;
    setStopSubmitting(true);
    try {
      await api.revokeDoctorAccess(stopDoctorTarget.doctorId);
      setStopDoctorTarget(null);
      await loadPatientData();
    } catch (err: any) {
      alert(err.message || "Failed to revoke access");
    } finally {
      setStopSubmitting(false);
    }
  };

  // Group active consents by doctor
  const activeConsentsByDoctor = useMemo(() => {
    const map = new Map<number, { doctorName: string; specialization: string; categories: string[]; expiresAt: string }>();
    consents
      .filter((c) => !c.revoked)
      .forEach((c) => {
        if (!map.has(c.doctorId)) {
          map.set(c.doctorId, {
            doctorName: c.doctorName,
            specialization: c.doctorSpecialization,
            categories: [],
            expiresAt: c.expiresAt,
          });
        }
        map.get(c.doctorId)!.categories.push(c.category);
      });
    return Array.from(map.entries()).map(([doctorId, data]) => ({ doctorId, ...data }));
  }, [consents]);

  const filteredDoctors = availableDoctors.filter(
    (d) =>
      !doctorSearch ||
      d.fullName.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialization.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.departmentName.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Patient Greeting & Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal uppercase tracking-wider">Patient Self-Governance</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {patient ? patient.fullName : "Patient Profile"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            You hold sovereign control over your medical records. Grant, modify, or revoke clinical access permissions anytime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShareError("");
              setShowShareModal(true);
            }}
            className="px-4 py-2.5 bg-teal hover:bg-teal-dark text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            + Find Doctor & Share Records
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold">Active Care Team Doctors</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{activeConsentsByDoctor.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold">Pending Requests</span>
          <div className="text-xl font-bold text-amber-600 mt-0.5">
            {accessRequests.filter((r) => r.status === "PENDING").length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold">Prescriptions</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{prescriptions.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold">Lab Reports</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{labReports.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold">Recorded Vitals</span>
          <div className="text-xl font-bold text-teal mt-0.5">{observations.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("consents")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "consents"
              ? "border-teal text-teal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          My Care Circle ({activeConsentsByDoctor.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "requests"
              ? "border-teal text-teal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Access Requests ({accessRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("prescriptions")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "prescriptions"
              ? "border-teal text-teal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          My Prescriptions ({prescriptions.length})
        </button>
        <button
          onClick={() => setActiveTab("labs")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "labs"
              ? "border-teal text-teal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Lab Reports & Results ({labReports.length})
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "documents"
              ? "border-teal text-teal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Document Center
        </button>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Loading health records...</div>
      ) : activeTab === "consents" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">My Care Circle (Active Sharing)</h3>
              <p className="text-xs text-slate-500">
                Verified physicians authorized to view portions of your health record. You can stop sharing anytime.
              </p>
            </div>
            <button
              onClick={() => {
                setShareError("");
                setShowShareModal(true);
              }}
              className="px-3 py-1.5 bg-teal/10 hover:bg-teal/20 text-teal text-xs font-bold rounded-lg transition"
            >
              + Add Doctor
            </button>
          </div>
          {activeConsentsByDoctor.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              You have not shared your medical records with any physicians. Click "+ Find Doctor & Share Records" to initiate care.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeConsentsByDoctor.map((item) => (
                <div key={item.doctorId} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">Dr. {item.doctorName}</span>
                      <span className="text-xs text-slate-500 font-medium">({item.specialization})</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        ACTIVE ACCESS
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-500">Shared Categories:</span>
                      {item.categories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] font-semibold bg-teal/10 text-teal px-2 py-0.5 rounded-md border border-teal/20"
                        >
                          {cat.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Access valid until: {new Date(item.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="shrink-0">
                    <button
                      onClick={() => setStopDoctorTarget({ doctorId: item.doctorId, doctorName: item.doctorName })}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition border border-rose-200"
                    >
                      Stop Sharing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "requests" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Access Requests</h3>
              <p className="text-xs text-slate-500">Status of requests sent to healthcare providers.</p>
            </div>
          </div>
          {accessRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No access requests on record.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {accessRequests.map((r) => (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Dr. {r.doctorName}</span>
                      <span className="text-xs text-slate-500">({r.doctorSpecialization})</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      Authorized categories: <span className="font-semibold">{r.requestedCategories.join(", ")}</span>
                    </p>
                    {r.notes && <p className="text-xs text-slate-500 italic">"{r.notes}"</p>}
                    <span className="text-[10px] text-slate-400 block">
                      Requested: {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "prescriptions" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Prescribed Medications</h3>
          </div>
          {prescriptions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No current prescriptions found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Prescription #{rx.id} · Issued by Dr. {rx.doctorName}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(rx.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="space-y-1.5">
                    {rx.items.map((item) => (
                      <div key={item.id} className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{item.medicationName}</span>
                          <span className="text-slate-500 ml-2">{item.dosage} · {item.frequency}</span>
                          {item.instructions && <p className="text-slate-600 text-[11px] mt-0.5">{item.instructions}</p>}
                        </div>
                        <span className="text-[10px] font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded">
                          {item.durationDays} Days
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "labs" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Diagnostic Laboratory Results</h3>
          </div>
          {labReports.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No laboratory test results recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {labReports.map((rep) => (
                <div key={rep.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{rep.testName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rep.flag === "NORMAL"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {rep.flag}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Result: <span className="font-bold text-slate-900">{rep.resultValue} {rep.unit}</span>
                      {rep.referenceRange && <span className="text-slate-400 ml-2">(Ref: {rep.referenceRange})</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(rep.reportedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "documents" ? (
        patient ? (
          <DocumentCenter patientId={patient.id} />
        ) : (
          <div className="py-12 text-center text-sm text-slate-400">Loading patient profile...</div>
        )
      ) : null}

      {/* Find Doctor & Share Records Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <h3 className="text-lg font-bold text-slate-900">Find Doctor & Share Medical Records</h3>
            <p className="text-xs text-slate-500">
              Select an attending physician and choose specifically which categories of your health record they are authorized to access.
            </p>

            {shareError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {shareError}
              </div>
            )}

            <form onSubmit={handleSendAccessRequest} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Physician *</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Filter doctors by name or specialty..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <select
                    required
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Choose a verified doctor...</option>
                    {filteredDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.fullName} ({doc.specialization} · {doc.departmentName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Granular Record Categories ({selectedCategories.length} selected) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllCategories}
                    className="text-[11px] text-teal hover:underline font-medium"
                  >
                    {selectedCategories.length === ALL_CONSENT_CATEGORIES.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                  {ALL_CONSENT_CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border text-xs transition ${
                        selectedCategories.includes(cat.id)
                          ? "bg-teal/5 border-teal/30 text-teal-dark font-semibold"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => handleToggleCategory(cat.id)}
                        className="mt-0.5 rounded text-teal focus:ring-teal"
                      />
                      <div>
                        <span className="block font-bold">{cat.label}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{cat.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Validity Duration</label>
                  <select
                    value={shareDurationDays}
                    onChange={(e) => setShareDurationDays(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="7">7 Days (Temporary Consult)</option>
                    <option value="30">30 Days (Standard Care)</option>
                    <option value="90">90 Days (Ongoing Treatment)</option>
                    <option value="365">1 Year (Primary Care)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Clinical Note / Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Second opinion consultation"
                    value={shareNotes}
                    onChange={(e) => setShareNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={shareSubmitting}
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shareSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-teal text-white rounded-lg hover:bg-teal-dark transition shadow-xs disabled:opacity-50"
                >
                  {shareSubmitting ? "Submitting..." : "Authorize & Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stop Sharing Confirmation Modal */}
      {stopDoctorTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Stop Sharing Medical Records?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to stop sharing all medical records with{" "}
              <span className="font-bold text-slate-900">Dr. {stopDoctorTarget.doctorName}</span>?
            </p>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              This will immediately revoke access to all clinical records for this physician and their delegated care team.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={stopSubmitting}
                onClick={() => setStopDoctorTarget(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={stopSubmitting}
                onClick={handleConfirmStopSharing}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
              >
                {stopSubmitting ? "Revoking..." : "Confirm Stop Sharing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
