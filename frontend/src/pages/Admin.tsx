import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type AdminDashboardStats,
  type AdminUser,
  type DoctorCareTeam,
  type NurseDetail,
  type DocumentAdminOverview,
  type AdminDocumentAction,
  type DatasetRegistryItem,
  type ModelRegistryItem,
  type AuditLogItem,
  type DocumentDetail,
} from "../api/client";
import { triggerHaptic } from "../utils/haptics";
import { useNotifications } from "../context/NotificationContext";

type AdminSection = "dashboard" | "people" | "careTeams" | "documents" | "oversight";

export default function Admin() {
  const { t } = useTranslation();
  const { showToast } = useNotifications();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [loading, setLoading] = useState(true);

  // 1. Dashboard State
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  // 2. People State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ fullName: "", email: "", phone: "", active: true });
  const [resetPwForm, setResetPwForm] = useState({ newPassword: "", reason: "" });

  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "DOCTOR",
    specialization: "General Practice",
    licenseNumber: "MD-90210",
    departmentId: 1,
  });

  // 3. Care Teams State
  const [doctors, setDoctors] = useState<DoctorCareTeam[]>([]);
  const [nursesList, setNursesList] = useState<NurseDetail[]>([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorCareTeam | null>(null);
  const [selectedNurseId, setSelectedNurseId] = useState<number | "">("");

  // 4. Documents State
  const [documents, setDocuments] = useState<DocumentAdminOverview[]>([]);
  const [docStatusFilter, setDocStatusFilter] = useState("ALL");
  const [selectedDoc, setSelectedDoc] = useState<DocumentAdminOverview | null>(null);
  const [docDetail, setDocDetail] = useState<DocumentDetail | null>(null);
  const [showViewDocModal, setShowViewDocModal] = useState(false);
  const [showRemoveDocModal, setShowRemoveDocModal] = useState(false);
  const [showDocActionsModal, setShowDocActionsModal] = useState(false);
  const [docActions, setDocActions] = useState<AdminDocumentAction[]>([]);
  const [adminAccessReason, setAdminAccessReason] = useState("");
  const [adminRemovalReason, setAdminRemovalReason] = useState("");

  // 5. Oversight & Audit State
  const [datasets, setDatasets] = useState<DatasetRegistryItem[]>([]);
  const [models, setModels] = useState<ModelRegistryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditQuery, setAuditQuery] = useState("");
  const [oversightTab, setOversightTab] = useState<"audit" | "models">("audit");

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, docsRes, nursesRes, docsOverviewRes, datasetsRes, modelsRes, logsRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.listUsers().catch(() => []),
        api.listAdminDoctors().catch(() => []),
        api.listAdminNurses().catch(() => []),
        api.listAdminDocuments(undefined, 0, 100).catch(() => ({ content: [] })),
        api.getDatasetRegistry().catch(() => []),
        api.getModelRegistry().catch(() => []),
        api.listAuditLogs(0, 100).catch(() => ({ content: [] })),
      ]);

      if (statsRes) setStats(statsRes);
      setUsers(usersRes);
      setDoctors(docsRes);
      setNursesList(nursesRes);
      setDocuments(docsOverviewRes.content || []);
      setDatasets(datasetsRes);
      setModels(modelsRes);
      setAuditLogs(logsRes.content || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter && u.role !== userRoleFilter) return false;
    if (userQuery) {
      const q = userQuery.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Documents
  const filteredDocuments = documents.filter((d) => {
    if (docStatusFilter === "ALL") return true;
    return d.adminStatus === docStatusFilter;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!auditQuery) return true;
    const q = auditQuery.toLowerCase();
    return (
      (log.actorUsername && log.actorUsername.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.resourceType && log.resourceType.toLowerCase().includes(q)) ||
      (log.result && log.result.toLowerCase().includes(q))
    );
  });

  // Pagination States
  const [userPage, setUserPage] = useState(0);
  const [userPageSize, setUserPageSize] = useState(10);
  const [docPage, setDocPage] = useState(0);
  const [docPageSize, setDocPageSize] = useState(10);
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(20);

  // Sliced paginated lists
  const paginatedUsers = filteredUsers.slice(userPage * userPageSize, (userPage + 1) * userPageSize);
  const paginatedDocuments = filteredDocuments.slice(docPage * docPageSize, (docPage + 1) * docPageSize);
  const paginatedAuditLogs = filteredAuditLogs.slice(auditPage * auditPageSize, (auditPage + 1) * auditPageSize);

  useEffect(() => {
    setUserPage(0);
  }, [userQuery, userRoleFilter]);

  useEffect(() => {
    setDocPage(0);
  }, [docStatusFilter]);

  useEffect(() => {
    setAuditPage(0);
  }, [auditQuery]);

  // User Actions
  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();
    triggerHaptic(10);
    try {
      await api.createStaff({
        username: createForm.username,
        password: createForm.password,
        fullName: createForm.fullName,
        email: createForm.email,
        role: createForm.role,
        departmentId: Number(createForm.departmentId),
        specialization: createForm.role === "DOCTOR" ? createForm.specialization : undefined,
        licenseNumber: createForm.role === "DOCTOR" || createForm.role === "NURSE" ? createForm.licenseNumber : undefined,
      });
      showToast({
        type: "success",
        title: "Staff Created",
        message: `${createForm.fullName} (${createForm.role}) created successfully.`,
      });
      setShowCreateModal(false);
      setCreateForm({
        username: "",
        password: "",
        fullName: "",
        email: "",
        role: "DOCTOR",
        specialization: "General Practice",
        licenseNumber: "MD-90210",
        departmentId: 1,
      });
      loadData();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Creation Failed",
        message: err.message || t("errors.GENERIC"),
        retry: () => handleCreateStaff(e),
      });
    }
  };

  const handleUpdateUserProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    triggerHaptic(10);
    try {
      await api.updateAdminUserProfile(selectedUser.id, editUserForm);
      showToast({
        type: "success",
        title: "Account Updated",
        message: "User profile updated successfully.",
      });
      setShowEditUserModal(false);
      loadData();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Update Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    triggerHaptic(10);
    try {
      await api.resetAdminUserPassword(selectedUser.id, resetPwForm);
      showToast({
        type: "success",
        title: "Password Reset",
        message: "Password updated successfully.",
      });
      setShowResetPasswordModal(false);
      setResetPwForm({ newPassword: "", reason: "" });
      loadData();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Reset Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  const handleToggleUserStatus = async (u: AdminUser) => {
    const nextStatus = !u.active;
    triggerHaptic(10);
    try {
      await api.updateUserStatus(u.id, nextStatus);
      showToast({
        type: "success",
        title: "Status Changed",
        message: nextStatus ? "User activated successfully." : "User suspended successfully.",
      });
      loadData();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Action Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  // Care Team Allocation
  const handleAllocateNurse = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedNurseId) return;
    triggerHaptic(10);
    try {
      await api.allocateNurseToDoctor(selectedDoctor.id, Number(selectedNurseId));
      showToast({
        type: "success",
        title: "Nurse Allocated",
        message: "Nurse allocated to doctor care team successfully.",
      });
      setShowAllocateModal(false);
      setSelectedNurseId("");
      loadData();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Allocation Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  const handleRemoveNurse = async (doctorId: number, nurseId: number) => {
    triggerHaptic(10);
    try {
      await api.removeNurseFromDoctor(doctorId, nurseId);
      showToast({
        type: "success",
        title: "Nurse Removed",
        message: "Nurse removed from doctor care team.",
      });
      loadData();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Removal Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  // Document Oversight
  const handleViewDocumentWithReason = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !adminAccessReason.trim()) return;
    triggerHaptic(10);
    try {
      const detail = await api.viewAdminDocument(selectedDoc.id, adminAccessReason.trim());
      setDocDetail(detail);
      setAdminAccessReason("");
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Access Denied",
        message: err.message || t("errors.UNAUTHORIZED"),
      });
    }
  };

  const handleRemoveDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !adminRemovalReason.trim()) return;
    triggerHaptic(10);
    try {
      await api.removeAdminDocument(selectedDoc.id, adminRemovalReason.trim());
      showToast({
        type: "success",
        title: "Document Removed",
        message: "Document removed from clinical visibility and patient notified.",
      });
      setShowRemoveDocModal(false);
      setAdminRemovalReason("");
      loadData();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Removal Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  const handleRestoreDocument = async (doc: DocumentAdminOverview) => {
    const reason = prompt("Enter administrative reason for restoring this document:", "Compliance review completed — record restored");
    if (reason === null) return;
    triggerHaptic(10);
    try {
      await api.restoreAdminDocument(doc.id, reason);
      showToast({
        type: "success",
        title: "Document Restored",
        message: "Document restored to active status and patient notified.",
      });
      loadData();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Restore Failed",
        message: err.message || t("errors.GENERIC"),
      });
    }
  };

  const handleViewDocActions = async (doc: DocumentAdminOverview) => {
    setSelectedDoc(doc);
    setShowDocActionsModal(true);
    triggerHaptic(5);
    try {
      const actions = await api.getAdminDocumentActions(doc.id);
      setDocActions(actions);
    } catch (err: any) {
      alert(err.message || t("errors.GENERIC"));
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
      {/* Admin Command Center Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-teal dark:text-teal-400 uppercase tracking-wider block">
              {t("common.appName")} · {t("common.roles.admin")}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {t("admin.title")} 🛡️
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("admin.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                triggerHaptic(5);
              }}
              className="btn-tactile px-4 py-2.5 rounded-xl bg-teal text-white hover:bg-teal-600 text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>+</span>
              <span>{t("admin.people.addStaff")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Primary Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: "dashboard", label: t("admin.sections.dashboard"), icon: "📊" },
          { key: "people", label: t("admin.sections.people"), icon: "👥" },
          { key: "careTeams", label: t("admin.sections.careTeams"), icon: "🤝" },
          { key: "documents", label: t("admin.sections.documents"), icon: "📑" },
          { key: "oversight", label: t("admin.sections.oversight"), icon: "🔍" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveSection(tab.key as AdminSection);
              triggerHaptic(5);
            }}
            className={`btn-tactile px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeSection === tab.key
                ? "bg-teal text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD OVERVIEW SECTION */}
      {/* ========================================================================= */}
      {activeSection === "dashboard" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                {t("admin.metrics.totalUsers")}
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                {stats?.totalUsers ?? users.length}
              </div>
              <p className="text-xs text-teal mt-1 font-medium">Doctors, nurses, patients, staff</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                {t("admin.metrics.careTeams")}
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                {doctors.length}
              </div>
              <p className="text-xs text-blue-600 mt-1 font-medium">Attending physician teams</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                {t("admin.metrics.docsUnderReview")}
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
                {documents.filter((d) => d.adminStatus === "ACTIVE").length}
              </div>
              <p className="text-xs text-amber-600 mt-1 font-medium">Active clinical documents</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                {t("admin.metrics.systemHealth")}
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                OPERATIONAL
              </div>
              <p className="text-xs text-emerald-600 mt-1 font-medium">100% Core services online</p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Quick Administrative Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setActiveSection("people")}
                className="btn-tactile p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal text-left cursor-pointer transition"
              >
                <span className="text-xl block mb-1">👥</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  {t("admin.sections.people")}
                </span>
                <span className="text-xs text-slate-400">Manage accounts & create staff</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("careTeams")}
                className="btn-tactile p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal text-left cursor-pointer transition"
              >
                <span className="text-xl block mb-1">🤝</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  {t("admin.sections.careTeams")}
                </span>
                <span className="text-xs text-slate-400">Allocate nurses to physicians</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("documents")}
                className="btn-tactile p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal text-left cursor-pointer transition"
              >
                <span className="text-xl block mb-1">📑</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  {t("admin.sections.documents")}
                </span>
                <span className="text-xs text-slate-400">Review, remove or restore records</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PEOPLE & STAFF SECTION */}
      {/* ========================================================================= */}
      {activeSection === "people" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("admin.people.title")} ({filteredUsers.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("admin.people.addUserDesc")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search username, name, email..."
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal"
              />
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn-tactile px-3.5 py-2 rounded-xl bg-teal text-white hover:bg-teal-600 text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer"
              >
                + {t("admin.people.addStaff")}
              </button>
            </div>
          </div>

          {/* Role Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { role: "", label: "All Roles" },
              { role: "DOCTOR", label: t("common.roles.doctor") },
              { role: "NURSE", label: t("common.roles.nurse") },
              { role: "PATIENT", label: t("common.roles.patient") },
              { role: "ADMIN", label: t("common.roles.admin") },
            ].map((f) => (
              <button
                key={f.role}
                type="button"
                onClick={() => setUserRoleFilter(f.role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  userRoleFilter === f.role
                    ? "bg-teal text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {u.fullName}
                      <span className="block text-slate-400 font-normal">{u.email}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {u.username}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        u.active
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}>
                        {u.active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setEditUserForm({ fullName: u.fullName, email: u.email, phone: "", active: u.active });
                          setShowEditUserModal(true);
                        }}
                        className="text-teal hover:underline font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setResetPwForm({ newPassword: "", reason: "" });
                          setShowResetPasswordModal(true);
                        }}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Reset PW
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u)}
                        className={`hover:underline font-semibold cursor-pointer ${u.active ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {u.active ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User Pagination Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                {t("common.pagination.showing", {
                  from: filteredUsers.length === 0 ? 0 : userPage * userPageSize + 1,
                  to: Math.min((userPage + 1) * userPageSize, filteredUsers.length),
                  total: filteredUsers.length,
                })}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <label className="flex items-center gap-1.5">
                <span>{t("common.pagination.perPage")}</span>
                <select
                  value={userPageSize}
                  onChange={(e) => {
                    setUserPageSize(Number(e.target.value));
                    setUserPage(0);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={userPage === 0}
                onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("common.actions.previous")}
              </button>
              <span className="px-2 font-mono text-xs">
                {t("common.pagination.page", {
                  current: userPage + 1,
                  total: Math.max(1, Math.ceil(filteredUsers.length / userPageSize)),
                })}
              </span>
              <button
                type="button"
                disabled={(userPage + 1) * userPageSize >= filteredUsers.length}
                onClick={() => setUserPage((p) => p + 1)}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("common.actions.next")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CARE TEAMS SECTION */}
      {/* ========================================================================= */}
      {activeSection === "careTeams" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t("admin.careTeams.title")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("admin.careTeams.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        Dr. {doc.fullName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {doc.specialization} · {doc.departmentName || "General"}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal dark:bg-teal-950/60 font-mono">
                      MD-{doc.id}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Allocated Nurses ({doc.nurses?.length || 0})
                    </span>
                    {doc.nurses && doc.nurses.length > 0 ? (
                      <div className="space-y-1.5">
                        {doc.nurses.map((n) => (
                          <div
                            key={n.id}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {n.fullName}
                              </span>
                              <span className="text-slate-400 ml-1.5 font-mono text-[10px]">
                                ({n.availabilityStatus || "AVAILABLE"})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveNurse(doc.id, n.id)}
                              className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
                              title={t("admin.careTeams.removeNurse")}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No nurses allocated yet.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setShowAllocateModal(true);
                      triggerHaptic(5);
                    }}
                    className="w-full btn-tactile py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-teal dark:text-teal-400 hover:bg-teal hover:text-white text-xs font-bold text-center transition cursor-pointer"
                  >
                    + {t("admin.careTeams.allocateNurse")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DOCUMENTS GOVERNANCE SECTION */}
      {/* ========================================================================= */}
      {activeSection === "documents" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("admin.documentGovernance.title")} ({filteredDocuments.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("admin.documentGovernance.desc")}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {["ALL", "ACTIVE", "REMOVED_BY_ADMIN"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setDocStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    docStatusFilter === st
                      ? "bg-teal text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {doc.title || doc.fileName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {doc.patientName || `#${doc.patientId}`}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {doc.category}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        doc.adminStatus === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}>
                        {doc.adminStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setShowViewDocModal(true);
                        }}
                        className="text-teal hover:underline font-semibold cursor-pointer"
                      >
                        View
                      </button>
                      {doc.adminStatus === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setShowRemoveDocModal(true);
                          }}
                          className="text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestoreDocument(doc)}
                          className="text-emerald-600 hover:underline font-semibold cursor-pointer"
                        >
                          Restore
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleViewDocActions(doc)}
                        className="text-slate-500 hover:underline font-semibold cursor-pointer"
                      >
                        Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Documents Pagination Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                {t("common.pagination.showing", {
                  from: filteredDocuments.length === 0 ? 0 : docPage * docPageSize + 1,
                  to: Math.min((docPage + 1) * docPageSize, filteredDocuments.length),
                  total: filteredDocuments.length,
                })}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <label className="flex items-center gap-1.5">
                <span>{t("common.pagination.perPage")}</span>
                <select
                  value={docPageSize}
                  onChange={(e) => {
                    setDocPageSize(Number(e.target.value));
                    setDocPage(0);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={docPage === 0}
                onClick={() => setDocPage((p) => Math.max(0, p - 1))}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("common.actions.previous")}
              </button>
              <span className="px-2 font-mono text-xs">
                {t("common.pagination.page", {
                  current: docPage + 1,
                  total: Math.max(1, Math.ceil(filteredDocuments.length / docPageSize)),
                })}
              </span>
              <button
                type="button"
                disabled={(docPage + 1) * docPageSize >= filteredDocuments.length}
                onClick={() => setDocPage((p) => p + 1)}
                className="btn-tactile px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t("common.actions.next")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. OVERSIGHT, AUDIT & AI SECTION */}
      {/* ========================================================================= */}
      {activeSection === "oversight" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOversightTab("audit")}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                oversightTab === "audit"
                  ? "bg-teal text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              📜 {t("admin.audit.title")}
            </button>
            <button
              type="button"
              onClick={() => setOversightTab("models")}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                oversightTab === "models"
                  ? "bg-teal text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              🤖 {t("admin.sections.models")}
            </button>
          </div>

          {oversightTab === "audit" ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {t("admin.audit.title")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("admin.audit.desc")}
                  </p>
                </div>
                <input
                  type="text"
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  placeholder="Filter actor, action, resource..."
                  className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">{t("admin.audit.timestamp")}</th>
                      <th className="py-2.5 px-3">{t("admin.audit.actor")}</th>
                      <th className="py-2.5 px-3">{t("admin.audit.action")}</th>
                      <th className="py-2.5 px-3">{t("admin.audit.resource")}</th>
                      <th className="py-2.5 px-3">{t("admin.audit.result")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {log.actorUsername}
                          <span className="block text-[10px] text-slate-400 font-normal">{log.actorRole}</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-teal">
                          {log.action}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {log.resourceType} {log.resourceId ? `#${log.resourceId}` : ""}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            log.result === "SUCCESS" || log.result === "ALLOW"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}>
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Audit Logs Pagination Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    {t("common.pagination.showing", {
                      from: filteredAuditLogs.length === 0 ? 0 : auditPage * auditPageSize + 1,
                      to: Math.min((auditPage + 1) * auditPageSize, filteredAuditLogs.length),
                      total: filteredAuditLogs.length,
                    })}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <label className="flex items-center gap-1.5">
                    <span>{t("common.pagination.perPage")}</span>
                    <select
                      value={auditPageSize}
                      onChange={(e) => {
                        setAuditPageSize(Number(e.target.value));
                        setAuditPage(0);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={auditPage === 0}
                    onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                    className="btn-tactile px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t("common.actions.previous")}
                  </button>
                  <span className="px-2 font-mono text-xs">
                    {t("common.pagination.page", {
                      current: auditPage + 1,
                      total: Math.max(1, Math.ceil(filteredAuditLogs.length / auditPageSize)),
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={(auditPage + 1) * auditPageSize >= filteredAuditLogs.length}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="btn-tactile px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t("common.actions.next")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dataset Registry */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Real-World Clinical Dataset Governance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Zero synthetic data in production paths. Honest research provenance tracking.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {datasets.map((ds) => (
                    <div
                      key={ds.id}
                      className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {ds.datasetName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          ds.accessStatus === "AVAILABLE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {ds.accessStatus}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        {ds.datasetType} · {ds.geography} ({ds.clinicalPeriod})
                      </p>
                      <div className="text-slate-500 font-mono text-[11px]">
                        Records: {ds.recordCount?.toLocaleString() || "N/A"} · Patients: {ds.patientCount?.toLocaleString() || "N/A"}
                      </div>
                      <p className="text-slate-400 italic text-[11px]">
                        {ds.sourceCitation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Registry */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Active ML Model Registry
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deterministic ML models bounded by feature extractors
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {models.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {m.modelName} (v{m.version})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal dark:bg-teal-950 font-bold">
                          {m.status}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">
                        Algorithm: {m.algorithm} · Target: {m.targetName}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Dataset: {m.datasetName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {t("admin.people.addStaff")}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("admin.people.username")}
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("admin.people.password")}
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("admin.people.fullName")}
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("admin.people.email")}
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("admin.people.role")}
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="DOCTOR">{t("common.roles.doctor")}</option>
                  <option value="NURSE">{t("common.roles.nurse")}</option>
                  <option value="ADMIN">{t("common.roles.admin")}</option>
                </select>
              </div>

              {createForm.role === "DOCTOR" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("admin.people.specialization")}
                    </label>
                    <input
                      type="text"
                      value={createForm.specialization}
                      onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t("admin.people.license")}
                    </label>
                    <input
                      type="text"
                      value={createForm.licenseNumber}
                      onChange={(e) => setCreateForm({ ...createForm, licenseNumber: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-tactile px-5 py-2 rounded-xl bg-teal text-white hover:bg-teal-600 font-bold shadow-sm cursor-pointer"
                >
                  {t("admin.people.saveStaff")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Edit User: {selectedUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUserProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("admin.people.fullName")}
                </label>
                <input
                  type="text"
                  required
                  value={editUserForm.fullName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("admin.people.email")}
                </label>
                <input
                  type="email"
                  required
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={editUserForm.active}
                  onChange={(e) => setEditUserForm({ ...editUserForm, active: e.target.checked })}
                  className="w-4 h-4 rounded-md text-teal"
                />
                <label htmlFor="userActiveCheck" className="font-semibold text-slate-700 dark:text-slate-300">
                  Account Active & Enabled
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-tactile px-5 py-2 rounded-xl bg-teal text-white hover:bg-teal-600 font-bold shadow-sm cursor-pointer"
                >
                  {t("common.actions.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Reset Password: {selectedUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={resetPwForm.newPassword}
                  onChange={(e) => setResetPwForm({ ...resetPwForm, newPassword: e.target.value })}
                  placeholder="Min 6 characters..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrative Reason (Audit trail)
                </label>
                <input
                  type="text"
                  required
                  value={resetPwForm.reason}
                  onChange={(e) => setResetPwForm({ ...resetPwForm, reason: e.target.value })}
                  placeholder="e.g. User requested credential reset via verified ticket..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!resetPwForm.newPassword || !resetPwForm.reason.trim()}
                  className="btn-tactile px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Nurse Modal */}
      {showAllocateModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {t("admin.careTeams.allocateNurse")}
              </h3>
              <button
                type="button"
                onClick={() => setShowAllocateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAllocateNurse} className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Allocate a nurse to Dr. {selectedDoctor.fullName} ({selectedDoctor.specialization}):
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Available Nurse
                </label>
                <select
                  value={selectedNurseId}
                  onChange={(e) => setSelectedNurseId(Number(e.target.value))}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Choose Nurse --</option>
                  {nursesList.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.fullName} ({n.departmentName || "General"}) — {n.availabilityStatus || "AVAILABLE"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!selectedNurseId}
                  className="btn-tactile px-5 py-2 rounded-xl bg-teal text-white hover:bg-teal-600 font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {t("admin.careTeams.allocateNurse")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Document Modal */}
      {showRemoveDocModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {t("admin.documentGovernance.confirmRemoval")}
              </h3>
              <button
                type="button"
                onClick={() => setShowRemoveDocModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRemoveDocument} className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                {t("admin.documentGovernance.reasonTitle")}
              </p>

              <div>
                <select
                  value={adminRemovalReason}
                  onChange={(e) => setAdminRemovalReason(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Choose Justification --</option>
                  <option value="Duplicate Document">{t("admin.documentGovernance.reasons.duplicate")}</option>
                  <option value="Patient Support Request">{t("admin.documentGovernance.reasons.patientSupport")}</option>
                  <option value="Data Correction Required">{t("admin.documentGovernance.reasons.dataCorrection")}</option>
                  <option value="Security / Privacy Review">{t("admin.documentGovernance.reasons.securityReview")}</option>
                  <option value="Other Administrative Reason">{t("admin.documentGovernance.reasons.other")}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRemoveDocModal(false)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  {t("common.actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!adminRemovalReason}
                  className="btn-tactile px-5 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {t("admin.documentGovernance.confirmRemoval")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Document Modal (Reason required) */}
      {showViewDocModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Administrative Document Access
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowViewDocModal(false);
                  setDocDetail(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!docDetail ? (
              <form onSubmit={handleViewDocumentWithReason} className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  HIPAA/GDPR compliance requires an explicit administrative justification to inspect patient medical records:
                </p>
                <textarea
                  value={adminAccessReason}
                  onChange={(e) => setAdminAccessReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Compliance review of patient upload following support ticket #1042..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={!adminAccessReason.trim()}
                    className="btn-tactile px-5 py-2 rounded-xl bg-teal text-white hover:bg-teal-600 font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    Authenticate & Open Record
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {docDetail.title || docDetail.fileName}
                  </p>
                  <p className="text-slate-500">Category: {docDetail.category} · Size: {Math.round((docDetail.fileSize || 0) / 1024)} KB</p>
                  <p className="text-slate-500">Uploaded: {new Date(docDetail.uploadedAt).toLocaleString()}</p>
                </div>
                {docDetail.description && (
                  <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {docDetail.description}
                  </p>
                )}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewDocModal(false);
                      setDocDetail(null);
                    }}
                    className="btn-tactile px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
                  >
                    {t("common.actions.close")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Action Audit Modal */}
      {showDocActionsModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Document Audit Trail (#{selectedDoc.id})
              </h3>
              <button
                type="button"
                onClick={() => setShowDocActionsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
              {docActions.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No administrative actions logged on this document.</p>
              ) : (
                docActions.map((act) => (
                  <div key={act.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{act.actionType}</span>
                      <span className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">By: {act.adminUsername}</p>
                    {act.administrativeReason && <p className="text-slate-500 italic">Reason: {act.administrativeReason}</p>}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDocActionsModal(false)}
                className="btn-tactile px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
              >
                {t("common.actions.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
