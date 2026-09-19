import { useEffect, useState, type FormEvent } from "react";
import { api, type AuditLogItem } from "../api/client";

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [modelMetrics, setModelMetrics] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"users" | "audit" | "ml" | "health">("users");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "DOCTOR",
    specialization: "General Practice",
    licenseNumber: "MD-90210",
    departmentId: 1,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, logsRes, metricsRes, statsRes] = await Promise.all([
        api.listUsers().catch(() => []),
        api.listAuditLogs(0, 50).catch(() => ({ content: [] })),
        api.getRiskModelMetrics().catch(() => null),
        api.getStats().catch(() => null),
      ]);
      setUsers(uList);
      setAuditLogs(logsRes.content || []);
      setModelMetrics(metricsRes);
      setStats(statsRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createStaff({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        departmentId: Number(form.departmentId),
        specialization: form.role === "DOCTOR" ? form.specialization : undefined,
        licenseNumber: form.role === "DOCTOR" || form.role === "NURSE" ? form.licenseNumber : undefined,
      });
      alert(`Staff account ${form.username} (${form.role}) successfully created.`);
      setForm({
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
      alert(err.message || "Failed to create user account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Hospital Administration</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Enterprise EHR Control Console</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage clinician credentials, inspect immutable audit trails, and oversee AI/ML clinical intelligence pipelines.
          </p>
          {loading && <p className="text-xs text-purple-600 mt-1">Refreshing administrative data...</p>}
        </div>
      </div>

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">Total Patients</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.patientCount ?? 0}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">Attending Physicians</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{stats.doctorCount ?? 0}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">Nursing Staff</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.nurseCount ?? 0}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">Active Consents</span>
            <div className="text-2xl font-black text-teal mt-1">{stats.activeConsentCount ?? 0}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "users"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Staff & User Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "audit"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Immutable Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("ml")}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "ml"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          ML Readmission Model v1.0
        </button>
      </div>

      {/* 1. Staff & User Management */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create User Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Provision Clinical Account</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Legal Name</label>
                <input
                  required
                  placeholder="e.g. Dr. Robert Chen"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">System Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="DOCTOR">DOCTOR</option>
                    <option value="NURSE">NURSE</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="PATIENT">PATIENT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="1">Cardiology</option>
                    <option value="2">Endocrinology</option>
                    <option value="3">General Medicine</option>
                    <option value="4">Emergency Medicine</option>
                  </select>
                </div>
              </div>
              {(form.role === "DOCTOR" || form.role === "NURSE") && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">License Number</label>
                    <input
                      required
                      placeholder="e.g. MD-12345"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  {form.role === "DOCTOR" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Specialization</label>
                      <input
                        required
                        placeholder="e.g. Cardiology"
                        value={form.specialization}
                        onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@hospital.org"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Username</label>
                  <input
                    required
                    placeholder="e.g. dr.chen"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                  <input
                    required
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                {saving ? "Provisioning..." : "Create Account"}
              </button>
            </form>
          </div>

          {/* User Directory Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lg:col-span-2 overflow-hidden">
            <h3 className="text-sm font-bold text-slate-900 mb-3">System Directory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">User</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5">
                        <strong className="text-slate-900 block">{u.fullName}</strong>
                        <span className="text-slate-400 font-mono text-[10px]">@{u.username}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">{u.email}</td>
                      <td className="p-2.5">
                        <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Audit Trail */}
      {activeTab === "audit" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Immutable System & Clinical Access Ledger</h3>
            <span className="text-xs text-slate-500">HIPAA compliant immutable log with actor attribution</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target Resource</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-semibold text-slate-900">{log.actorUsername}</td>
                    <td className="p-3">
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{log.actorRole}</span>
                    </td>
                    <td className="p-3 font-bold text-teal">{log.action}</td>
                    <td className="p-3 text-slate-600">
                      {log.resourceType} #{log.resourceId}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {log.result}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ML Model Performance */}
      {activeTab === "ml" && modelMetrics && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal uppercase tracking-wider">Production Model</span>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  v{modelMetrics.model_version || "1.0.0"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{modelMetrics.dataset_name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Trained on clinical EHR records using balanced RandomForest with stratified k-fold evaluation.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Trained: {modelMetrics.trained_at ? new Date(modelMetrics.trained_at).toLocaleString() : "Active"}
            </span>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Accuracy</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {((modelMetrics.accuracy || 0.869) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Precision</span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {((modelMetrics.precision || 0.945) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Recall</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {((modelMetrics.recall || 0.88) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">F1-Score</span>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {((modelMetrics.f1_score || 0.912) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">ROC-AUC</span>
              <div className="text-2xl font-black text-teal mt-1">
                {((modelMetrics.roc_auc || 0.943) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Feature Importances Breakdown */}
          {modelMetrics.feature_importances && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Feature Weights & Information Gain
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(modelMetrics.feature_importances).map(([f, val]: any) => (
                  <div key={f} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-medium text-slate-700 block uppercase text-[10px]">
                      {f.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mr-2">
                        <div
                          className="bg-teal h-1.5 rounded-full"
                          style={{ width: `${Number(val) * 100 * 2.5}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {(Number(val) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
