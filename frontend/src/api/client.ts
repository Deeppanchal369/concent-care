export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fallbackMessageForStatus(status: number): string {
  switch (status) {
    case 400: return "That request wasn't valid. Please check the details and try again.";
    case 401: return "Your session has expired. Please log in again.";
    case 403: return "You don't have permission to perform this medical action or view this patient's records.";
    case 404: return "The requested clinical record couldn't be found.";
    case 409: return "That conflicts with an existing medical record.";
    case 413: return "Uploaded clinical document exceeds file size limits.";
    case 429: return "Too many requests. Please wait a moment.";
    case 502:
    case 503:
    case 504: return "A downstream medical service is temporarily unreachable.";
    default: return status >= 500
      ? "An internal healthcare service error occurred. Please try again shortly."
      : "Something went wrong with that request.";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("cc_token");
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Unable to reach ConsentCare Core Service. Check connection or service status.", 0, "NETWORK_ERROR");
  }

  if (!res.ok) {
    let message = fallbackMessageForStatus(res.status);
    let code = "UNKNOWN_ERROR";
    try {
      const body = await res.json();
      if (body && typeof body.error === "string" && body.error.trim()) {
        message = body.error;
        code = typeof body.code === "string" ? body.code : code;
      }
    } catch {
      // not JSON
    }

    if (res.status === 401 && token) {
      localStorage.removeItem("cc_token");
      localStorage.removeItem("cc_user");
      window.dispatchEvent(new Event("cc:session-expired"));
      throw new ApiError(message, 401, "SESSION_EXPIRED");
    }
    throw new ApiError(message, res.status, code);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.blob() as unknown as Promise<T>;
}

// ----------------------------------------------------
// TypeScript Interfaces
// ----------------------------------------------------

export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: "ADMIN" | "DOCTOR" | "NURSE" | "PATIENT";
  fullName: string;
}

export interface Patient {
  id: number;
  linkedUserId?: number | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  medicalHistorySummary: string | null;
  createdAt: string;
}

export interface Doctor {
  id: number;
  userId: number;
  fullName: string;
  specialization: string;
  licenseNumber: string;
  departmentName: string;
}

export interface Nurse {
  id: number;
  userId: number;
  fullName: string;
  licenseNumber: string;
  departmentName: string;
  availabilityStatus: "AVAILABLE" | "BUSY" | "OFF_DUTY";
}

export interface NurseTask {
  id: number;
  doctorId: number;
  doctorName: string;
  nurseId: number;
  nurseName: string;
  patientId: number;
  patientName: string;
  patientAge?: number | null;
  patientGender?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  emergencyContact?: string | null;
  taskType: string;
  priority: string;
  instructions: string;
  status: "ASSIGNED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  dueTime: string | null;
  acceptedAt?: string | null;
  startedAt?: string | null;
  completedAt: string | null;
  completionNotes?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
}

export interface Consent {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  doctorSpecialization: string;
  category: string;
  purpose: string;
  grantedAt: string;
  expiresAt: string;
  revoked: boolean;
  revokedAt: string | null;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED";
  grantedBy?: string;
  revokedBy?: string | null;
}

export interface AccessRequest {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  doctorSpecialization: string;
  requestedBy: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" | "EXPIRED";
  requestedCategories: string[];
  notes: string;
  durationDays?: number;
  reviewedById?: number | null;
  reviewedByName?: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export interface Encounter {
  id: number;
  patientId: number;
  doctorId: number;
  doctorName: string;
  encounterType: string;
  chiefComplaint: string | null;
  clinicalNotes: string | null;
  assessmentPlan: string | null;
  encounterDate: string;
  isAmended?: boolean;
  amendmentNotes?: string | null;
  amendedAt?: string | null;
  amendedBy?: number | null;
  amendedByName?: string | null;
  isArchived?: boolean;
}

export interface Diagnosis {
  id: number;
  patientId: number;
  doctorId: number;
  doctorName: string;
  encounterId: number | null;
  code: string | null;
  description: string;
  severity: string;
  status?: string;
  notes?: string | null;
  isArchived?: boolean;
  diagnosedDate: string;
}

export interface LabRequest {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  testName: string;
  category: string;
  urgency: string;
  status: "ORDERED" | "SAMPLE_COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  instructions: string | null;
  createdAt: string;
}

export interface LabReport {
  id: number;
  labRequestId: number | null;
  patientId: number;
  documentId: number | null;
  testName: string;
  resultValue: string;
  unit: string | null;
  referenceRange: string | null;
  flag: "NORMAL" | "HIGH" | "LOW" | "CRITICAL" | "ABNORMAL";
  reportedAt: string;
}

export interface Observation {
  id: number;
  patientId: number;
  nurseId: number | null;
  nurseName: string | null;
  doctorId: number | null;
  doctorName: string | null;
  vitalType: string;
  valueNumeric: number;
  valueText: string | null;
  unit: string;
  notes: string | null;
  observedAt: string;
}

export interface PrescriptionItem {
  id: number;
  prescriptionId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string | null;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface Prescription {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  encounterId: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  items: PrescriptionItem[];
}

export interface AiDocumentAnalysis {
  id: number;
  documentId: number;
  reportType: string;
  summaryText: string;
  entitiesJson: string;
  confidenceScore?: number | null;
  disclaimer: string;
  modelProvider?: string | null;
  modelVersion?: string | null;
  status?: string | null;
  structuredResultJson?: string | null;
  createdAt: string;
}

export interface DocumentItem {
  id: number;
  documentId?: number;
  patientId: number;
  title?: string;
  originalFilename?: string;
  fileName: string;
  contentType: string | null;
  mimeType?: string | null;
  fileSize: number;
  size?: number;
  category: string;
  description: string | null;
  processingStatus: string;
  aiStatus: string;
  uploadedAt: string;
  uploadedBy?: number;
  uploadedByName: string;
  sharingStatus?: "PRIVATE" | "SHARED" | string;
  sharedWithDoctorIds?: number[];
  sharedWithDoctorNames?: string[];
  isArchived?: boolean;
  extractedText?: string | null;
  aiAnalysis?: AiDocumentAnalysis | null;
  adminStatus?: "ACTIVE" | "UNDER_REVIEW" | "REMOVED_BY_ADMIN" | "ARCHIVED" | "RESTORED" | string;
  removalReason?: string | null;
  removedBy?: number | null;
  removedByName?: string | null;
  removedAt?: string | null;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  lockedUsers: number;
  doctorsCount: number;
  nursesCount: number;
  patientsCount: number;
  adminsCount: number;
  totalConsentsCount: number;
  activeConsentsCount: number;
  expiredConsentsCount: number;
  revokedConsentsCount: number;
  totalEncountersCount: number;
  totalLabReportsCount: number;
  totalPrescriptionsCount: number;
  totalVitalsCount: number;
  totalDocumentsCount: number;
  activeDocumentsCount: number;
  removedDocumentsCount: number;
  pendingAiDocumentsCount: number;
  activeAllocationsCount: number;
  activeNurseTasksCount: number;
  completedNurseTasksCount: number;
  totalAuditLogsCount: number;
  totalDocumentActionsCount: number;
  totalAiRunsCount: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "DOCTOR" | "NURSE" | "PATIENT";
  active: boolean;
  createdAt: string;
}

export interface DoctorCareTeam {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  specialization: string;
  departmentName: string;
  licenseNumber: string;
  contactNumber: string;
  nurses: {
    id: number;
    userId: number;
    fullName: string;
    email: string;
    departmentName: string;
    availabilityStatus: string;
    contactNumber: string;
  }[];
}

export interface NurseDetail {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  departmentName: string;
  availabilityStatus: string;
  contactNumber: string;
  activeTasksCount: number;
  assignedDoctorNames: string[];
}

export interface PatientAdminOverview {
  id: number;
  linkedUserId: number | null;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  registeredAt: string;
  documentCount: number;
  consentCount: number;
}

export interface DocumentAdminOverview {
  id: number;
  patientId: number;
  patientName: string;
  title: string;
  originalFilename: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  category: string;
  adminStatus: string;
  removalReason: string | null;
  removedBy: number | null;
  removedByName: string | null;
  removedAt: string | null;
  uploadedAt: string;
}

export interface AdminDocumentAction {
  id: number;
  documentId: number;
  adminUserId: number;
  adminUsername: string;
  actionType: string;
  administrativeReason: string;
  timestamp: string;
  result: string;
}

export interface DatasetRegistryItem {
  id: number;
  datasetName: string;
  datasetType: string;
  geography: string;
  clinicalPeriod: string;
  patientCount: number;
  recordCount: number;
  accessStatus: string;
  trainingStatus: string;
  validationStatus: string;
  modelVersion: string;
  metricsJson: string | null;
  limitations: string;
  sourceCitation: string;
  isPrimaryResearch: boolean;
  createdAt: string;
}

export interface ModelRegistryItem {
  id: number;
  modelKey: string;
  modelName: string;
  version: string;
  algorithm: string;
  datasetName: string;
  targetName: string;
  predictionHorizon: string;
  featuresJson: string;
  metricsJson: string | null;
  featureImportancesJson: string | null;
  limitations: string;
  status: string;
  trainedAt: string | null;
}

export interface LongitudinalClinicalInsights {
  patient_id: number;
  generated_at: string;
  model_version: string;
  active_dataset: string;
  primary_research_dataset: string;
  risk_assessment: Record<string, unknown>;
  past_clinical_trajectory: string;
  current_clinical_status: string;
  trend_progression_analysis: string;
  future_risk_stratification: string;
  symptoms_to_monitor: string[];
  evidence_provenance: string[];
  requires_clinical_review: boolean;
  clinical_disclaimer: string;
  synthesis_type?: string;
  model_provider?: string;
}

export type DocumentDetail = DocumentItem;

export interface PatientActivity {
  id: number;
  actorUsername: string;
  actorRole: string;
  category: string;
  decision: "ALLOW" | "DENY" | string;
  reason: string | null;
  flagged: boolean;
  accessedAt: string;
}

export interface RiskPredictionResult {
  id?: number;
  patient_id?: string | number;
  patientId?: number;
  status?: "COMPLETED" | "INSUFFICIENT_DATA" | "FAILED" | string;
  risk_probability?: number | null;
  riskScore?: number | null;
  risk_label?: "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_DATA" | string;
  riskLevel?: string;
  model_version?: string;
  modelVersion?: string;
  top_contributing_factors?: Record<string, number>;
  contributingFactorsJson?: string;
  features_used?: Record<string, unknown>;
  featuresUsedJson?: string;
  data_completeness?: string;
  dataCompleteness?: string;
  message?: string;
  notes?: string | null;
  clinical_disclaimer?: string;
  clinicalDisclaimer?: string;
  created_at?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  readStatus: boolean;
  createdAt: string;
}

export type FactType = "ENCOUNTER" | "DIAGNOSIS" | "MEDICATION" | "LAB_REPORT" | "OBSERVATION";
export type FactStatus = "PENDING" | "CONFIRMED" | "EDITED" | "REJECTED";

export interface ExtractedFact {
  id: number;
  documentId: number;
  patientId: number;
  factType: FactType;
  fieldName: string;
  extractedData: Record<string, any>;
  confirmedData: Record<string, any> | null;
  status: FactStatus;
  confidenceLevel: string;
  canonicalEntityType: string | null;
  canonicalEntityId: number | null;
  reviewedByUserId: number | null;
  reviewedByUserName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  provenanceText: string;
  createdAt: string;
}

export interface ConfirmFactDecision {
  factId: number;
  action: "CONFIRM" | "EDIT" | "REJECT";
  editedData?: Record<string, any> | null;
  rejectionReason?: string | null;
}

export interface ConfirmFactsBatchRequest {
  decisions: ConfirmFactDecision[];
}

export interface FactConfirmationSummary {
  totalProcessed: number;
  confirmedCount: number;
  editedCount: number;
  rejectedCount: number;
  duplicatesSkipped: number;
  message: string;
}

export interface AuditLogItem {
  id: number;
  actorUsername: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: string;
  metadataJson: string | null;
  timestamp: string;
}

// ----------------------------------------------------
// API Client Methods
// ----------------------------------------------------

export const api = {
  // Auth
  login: (data: { username: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  register: (data: { username: string; password: string; fullName: string; email: string; phone?: string; dateOfBirth?: string; gender?: string }) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),

  getMe: () => request<AuthResponse>("/api/auth/me"),

  // Patient
  getMyPatient: () => request<Patient>("/api/patients/me"),
  getPatient: (id: number) => request<Patient>(`/api/patients/${id}`),
  listAllPatients: () => request<Patient[]>("/api/patients"),
  createPatient: (data: Partial<Patient>) =>
    request<Patient>("/api/patients", { method: "POST", body: JSON.stringify(data) }),

  // Doctors & Care Team
  getMyDoctorProfile: () => request<Doctor>("/api/doctors/me"),
  listDoctors: (query?: string) =>
    request<Doctor[]>(`/api/doctors${query ? `?query=${encodeURIComponent(query)}` : ""}`),
  listDoctorsPaged: (query?: string, page: number = 0, size: number = 10) =>
    request<PageResponse<Doctor>>(`/api/doctors/paged?page=${page}&size=${size}${query ? `&query=${encodeURIComponent(query)}` : ""}`),
  listDoctorPatients: () => request<Patient[]>("/api/doctors/my/patients"),
  listDoctorPatientsPaged: (page: number = 0, size: number = 10, query?: string) =>
    request<PageResponse<Patient>>(`/api/doctors/my/patients/paged?page=${page}&size=${size}${query ? `&query=${encodeURIComponent(query)}` : ""}`),
  listDoctorAccessRequests: () => request<AccessRequest[]>("/api/doctors/my/requests"),
  respondAccessRequest: (requestId: number, status: "APPROVED" | "REJECTED", durationDays: number = 30) =>
    request<void>(`/api/doctors/requests/${requestId}/respond`, { method: "POST", body: JSON.stringify({ status, durationDays }) }),
  listDoctorNurseTeam: () => request<Nurse[]>("/api/doctors/my/nurses"),
  listDoctorNurses: (doctorId: number) => request<Nurse[]>(`/api/doctors/${doctorId}/nurses`),
  createNurseTask: (data: { doctorId: number; nurseId: number; patientId: number; taskType: string; instructions: string; priority?: string; dueTime?: string }) =>
    request<NurseTask>("/api/nurses/tasks", { method: "POST", body: JSON.stringify(data) }),
  listDoctorTasks: () => request<NurseTask[]>("/api/doctors/my/tasks"),

  // Nurse Workstation
  listNurses: () => request<Nurse[]>("/api/nurses"),
  listNursePatients: () => request<Patient[]>("/api/doctors/my/patients"),
  listNurseTasks: () => request<NurseTask[]>("/api/nurses/my/tasks"),
  updateNurseTaskStatus: (taskId: number, status: string, notes?: string) =>
    request<NurseTask>(`/api/nurses/tasks/${taskId}/status`, { method: "PATCH", body: JSON.stringify({ status, notes }) }),
  getMyNurseStatus: () => request<Nurse>("/api/nurses/me"),
  setNurseStatus: (nurseId: number, status: "AVAILABLE" | "BUSY" | "OFF_DUTY") =>
    request<void>(`/api/nurses/${nurseId}/status?status=${status}`, { method: "PATCH" }),

  // Consent & Sharing
  listMyConsents: () => request<Consent[]>("/api/consents/my"),
  listMyAccessRequests: () => request<AccessRequest[]>("/api/consents/my-requests"),
  listIncomingAccessRequests: () => request<AccessRequest[]>("/api/consents/my-requests"),
  listPatientConsents: (patientId: number) => request<Consent[]>(`/api/consents/patient/${patientId}`),
  grantConsent: (data: { doctorId: number; category: string; purpose: string; expiresAt: string }) =>
    request<Consent>("/api/consents/grant", { method: "POST", body: JSON.stringify(data) }),
  grantConsentsDirectly: (data: {
    doctorId: number;
    category?: string;
    categories?: string[];
    purpose?: string;
    expiresAt?: string;
    durationHours?: number;
    durationMinutes?: number;
  }) => request<Consent[]>("/api/consents/grant-batch", { method: "POST", body: JSON.stringify(data) }),
  processConsentExpirations: () =>
    request<{ processedCount: number; message: string }>("/api/consents/process-expirations", { method: "POST" }),
  revokeConsent: (consentId: number) =>
    request<Consent>(`/api/consents/${consentId}/revoke`, { method: "POST" }),
  revokeDoctorAccess: (doctorId: number) =>
    request<{ message: string; revokedCount: number }>(`/api/consents/revoke-doctor/${doctorId}`, { method: "POST" }),
  requestAccess: (data: { doctorId: number; categories: string[]; notes?: string; durationDays?: number }) =>
    request<AccessRequest>("/api/consents/request", { method: "POST", body: JSON.stringify(data) }),

  // Clinical Records
  createEncounter: (data: { patientId: number; encounterType: string; chiefComplaint?: string; clinicalNotes?: string; assessmentPlan?: string }) =>
    request<Encounter>("/api/clinical/encounters", { method: "POST", body: JSON.stringify(data) }),
  listEncounters: (patientId: number) => request<Encounter[]>(`/api/clinical/encounters/patient/${patientId}`),
  listEncountersPaged: (patientId: number, page: number = 0, size: number = 10) =>
    request<PageResponse<Encounter>>(`/api/clinical/encounters/patient/${patientId}/paged?page=${page}&size=${size}`),
  amendEncounter: (id: number, amendmentNotes: string) =>
    request<Encounter>(`/api/clinical/encounters/${id}/amend`, { method: "POST", body: JSON.stringify({ amendmentNotes }) }),

  addDiagnosis: (data: { patientId: number; encounterId?: number; code?: string; description: string; severity?: string; notes?: string }) =>
    request<Diagnosis>("/api/clinical/diagnoses", { method: "POST", body: JSON.stringify(data) }),
  listDiagnoses: (patientId: number) => request<Diagnosis[]>(`/api/clinical/diagnoses/patient/${patientId}`),
  listDiagnosesPaged: (patientId: number, page: number = 0, size: number = 10) =>
    request<PageResponse<Diagnosis>>(`/api/clinical/diagnoses/patient/${patientId}/paged?page=${page}&size=${size}`),
  updateDiagnosisStatus: (id: number, data: { status: string; notes?: string }) =>
    request<Diagnosis>(`/api/clinical/diagnoses/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),

  createLabRequest: (data: { patientId: number; testName: string; category?: string; urgency?: string; instructions?: string }) =>
    request<LabRequest>("/api/clinical/lab-requests", { method: "POST", body: JSON.stringify(data) }),
  listLabRequests: (patientId: number) => request<LabRequest[]>(`/api/clinical/lab-requests/patient/${patientId}`),
  updateLabRequestStatus: (requestId: number, status: string) =>
    request<LabRequest>(`/api/clinical/lab-requests/${requestId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  recordLabReport: (data: { patientId: number; labRequestId?: number; documentId?: number; testName: string; resultValue: string; unit?: string; referenceRange?: string; flag?: string }) =>
    request<LabReport>("/api/clinical/lab-reports", { method: "POST", body: JSON.stringify(data) }),
  listLabReports: (patientId: number) => request<LabReport[]>(`/api/clinical/lab-reports/patient/${patientId}`),
  listLabReportsPaged: (patientId: number, page: number = 0, size: number = 10) =>
    request<PageResponse<LabReport>>(`/api/clinical/lab-reports/patient/${patientId}/paged?page=${page}&size=${size}`),

  recordObservation: (data: { patientId: number; vitalType: string; valueNumeric: number; unit: string; notes?: string }) =>
    request<Observation>("/api/clinical/observations", { method: "POST", body: JSON.stringify(data) }),
  listObservations: (patientId: number) => request<Observation[]>(`/api/clinical/observations/patient/${patientId}`),

  // Prescriptions
  createPrescription: (data: { patientId: number; encounterId?: number; notes?: string; items: { medicationName: string; dosage: string; frequency: string; durationDays: number; instructions?: string }[] }) =>
    request<Prescription>("/api/prescriptions", { method: "POST", body: JSON.stringify(data) }),
  listPrescriptions: (patientId: number) => request<Prescription[]>(`/api/prescriptions/patient/${patientId}`),
  listPrescriptionsPaged: (patientId: number, page: number = 0, size: number = 10) =>
    request<PageResponse<Prescription>>(`/api/prescriptions/patient/${patientId}/paged?page=${page}&size=${size}`),
  recordAdministration: (data: { prescriptionItemId: number; status?: string; notes?: string }) =>
    request<{ message: string }>("/api/prescriptions/administrations", { method: "POST", body: JSON.stringify(data) }),

  // Documents & AI Processing
  uploadDocument: (patientId: number, file: File, category: string = "OTHER", description: string = "", title: string = "") => {
    const form = new FormData();
    form.append("patientId", String(patientId));
    form.append("file", file);
    if (category) form.append("category", category);
    if (description) form.append("description", description);
    if (title) form.append("title", title);
    return request<DocumentItem>("/api/documents/upload", { method: "POST", body: form });
  },
  listDocuments: (patientId: number) => request<DocumentItem[]>(`/api/documents/patient/${patientId}`),
  listDocumentsPaged: (patientId: number, params?: { category?: string; search?: string; page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append("category", params.category);
    if (params?.search) q.append("search", params.search);
    q.append("page", String(params?.page ?? 0));
    q.append("size", String(params?.size ?? 10));
    return request<PageResponse<DocumentItem>>(`/api/documents/patient/${patientId}/paged?${q.toString()}`);
  },
  getDocumentDetail: (documentId: number) => request<DocumentDetail>(`/api/documents/${documentId}`),
  updateDocument: (id: number, data: { title?: string; category?: string; description?: string }) =>
    request<DocumentItem>(`/api/documents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  archiveDocument: (id: number) =>
    request<{ message: string }>(`/api/documents/${id}`, { method: "DELETE" }),
  shareDocument: (id: number, doctorId: number) =>
    request<DocumentItem>(`/api/documents/${id}/share`, { method: "POST", body: JSON.stringify({ doctorId }) }),
  revokeDocumentShare: (id: number, doctorId: number) =>
    request<DocumentItem>(`/api/documents/${id}/share/${doctorId}`, { method: "DELETE" }),
  downloadDocument: async (documentId: number, fileName: string) => {
    const blob = await request<Blob>(`/api/documents/${documentId}/download`, { method: "GET" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  previewDocument: async (documentId: number): Promise<string> => {
    const blob = await request<Blob>(`/api/documents/${documentId}/preview`, { method: "GET" });
    return window.URL.createObjectURL(blob);
  },

  // Clinical Fact Normalization & Review Bridge
  getDocumentFacts: (documentId: number) =>
    request<ExtractedFact[]>(`/api/documents/${documentId}/facts`),
  confirmDocumentFacts: (documentId: number, req: ConfirmFactsBatchRequest) =>
    request<FactConfirmationSummary>(`/api/documents/${documentId}/facts/confirm`, { method: "POST", body: JSON.stringify(req) }),
  getPatientPendingFacts: (patientId: number) =>
    request<ExtractedFact[]>(`/api/documents/patient/${patientId}/pending-facts`),

  // Patient Activity Log
  getPatientActivityPaged: (patientId: number, page: number = 0, size: number = 15) =>
    request<PageResponse<PatientActivity>>(`/api/patients/${patientId}/activity?page=${page}&size=${size}`),

  // Real ML Risk Prediction (Features computed automatically from EHR records)
  predictPatientRisk: (patientId: number) =>
    request<RiskPredictionResult>(`/api/risk/patient/${patientId}`, { method: "POST" }),
  listRiskHistory: (patientId: number) =>
    request<RiskPredictionResult[]>(`/api/risk/patient/${patientId}`),
  getRiskModelMetrics: () =>
    request<Record<string, unknown>>("/api/risk/metrics"),

  // HL7 FHIR R4 Interoperability
  getFhirPatient: (patientId: number) => request<Record<string, unknown>>(`/api/fhir/Patient/${patientId}`),
  getFhirBundle: (patientId: number) => request<Record<string, unknown>>(`/api/fhir/Patient/${patientId}/$everything`),

  // Notifications
  listNotifications: () => request<NotificationItem[]>("/api/notifications"),
  markNotificationRead: (id: number) => request<void>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request<void>("/api/notifications/read-all", { method: "POST" }),
  getUnreadNotificationCount: () => request<{ unreadCount: number }>("/api/notifications/unread-count"),

  // Longitudinal Doctor Clinical AI
  generateClinicalInsights: (patientId: number, language?: string) => {
    const qs = language ? `?language=${encodeURIComponent(language)}` : "";
    return request<LongitudinalClinicalInsights>(`/api/ai/clinical-insights/${patientId}${qs}`, { method: "POST" });
  },
  getLatestClinicalInsights: (patientId: number) =>
    request<LongitudinalClinicalInsights | null>(`/api/ai/clinical-insights/${patientId}/latest`),

  // Admin Command Center & Real-World Dataset Governance
  getDashboardStats: () => request<AdminDashboardStats>("/api/admin/dashboard-stats"),
  getStats: () => request<AdminDashboardStats>("/api/admin/dashboard-stats"),
  listUsers: (query?: string, role?: string, active?: boolean) => {
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (role) params.append("role", role);
    if (active !== undefined) params.append("active", String(active));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<AdminUser[]>(`/api/admin/users${qs}`);
  },
  listUsersPaged: (page = 0, size = 20, query?: string, role?: string, active?: boolean) => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("size", String(size));
    if (query) params.append("query", query);
    if (role) params.append("role", role);
    if (active !== undefined) params.append("active", String(active));
    return request<{ content: AdminUser[]; totalElements: number; totalPages: number; number: number; size: number }>(`/api/admin/users/paged?${params.toString()}`);
  },
  getAdminUser: (id: number) => request<AdminUser>(`/api/admin/users/${id}`),
  updateAdminUserProfile: (id: number, data: { fullName?: string; email?: string; phone?: string; active?: boolean }) =>
    request<AdminUser>(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  resetAdminUserPassword: (id: number, data: { newPassword: string; reason?: string }) =>
    request<{ message: string }>(`/api/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify(data) }),
  updateUserStatus: (id: number, active: boolean) =>
    request<void>(`/api/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ active }) }),
  createStaff: (data: { username: string; password: string; fullName: string; email: string; role: string; departmentId?: number; licenseNumber?: string; specialization?: string }) =>
    request<any>("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),

  // Doctor Care Team Allocation & Nurse Directory
  listAdminDoctors: () => request<DoctorCareTeam[]>("/api/admin/doctors"),
  allocateNurseToDoctor: (doctorId: number, nurseId: number) =>
    request<{ message: string }>(`/api/admin/doctors/${doctorId}/nurses/${nurseId}`, { method: "POST" }),
  removeNurseFromDoctor: (doctorId: number, nurseId: number) =>
    request<{ message: string }>(`/api/admin/doctors/${doctorId}/nurses/${nurseId}`, { method: "DELETE" }),
  listAdminNurses: () => request<NurseDetail[]>("/api/admin/nurses"),

  // Patient Directory Overview (Least Privilege)
  listAdminPatients: (page: number = 0, size: number = 50, query?: string) => {
    const qs = query ? `&query=${encodeURIComponent(query)}` : "";
    return request<{ content: PatientAdminOverview[]; totalElements: number; totalPages: number; page: number }>(`/api/admin/patients?page=${page}&size=${size}${qs}`);
  },

  // Document Oversight Center
  listAdminDocuments: (status?: string, page: number = 0, size: number = 50) => {
    const s = status ? `&status=${encodeURIComponent(status)}` : "";
    return request<{ content: DocumentAdminOverview[]; totalElements: number; totalPages: number; page: number }>(`/api/admin/documents?page=${page}&size=${size}${s}`);
  },
  viewAdminDocument: (id: number, reason: string) =>
    request<DocumentDetail>(`/api/admin/documents/${id}/view`, { method: "POST", body: JSON.stringify({ reason }) }),
  removeAdminDocument: (id: number, reason: string) =>
    request<{ message: string }>(`/api/admin/documents/${id}/remove`, { method: "POST", body: JSON.stringify({ reason }) }),
  restoreAdminDocument: (id: number, reason?: string) =>
    request<{ message: string }>(`/api/admin/documents/${id}/restore`, { method: "POST", body: JSON.stringify({ reason }) }),
  getAdminDocumentActions: (id: number) =>
    request<AdminDocumentAction[]>(`/api/admin/documents/${id}/actions`),

  // AI Monitoring, Dataset Registry & Model Registry
  getDatasetRegistry: () => request<DatasetRegistryItem[]>("/api/admin/ai/datasets"),
  getModelRegistry: () => request<ModelRegistryItem[]>("/api/admin/ai/models"),
  getAiMonitoringStats: () => request<Record<string, unknown>>("/api/admin/ai/monitoring"),

  // Audit Logs & Departments
  listAuditLogs: (page: number = 0, size: number = 50) =>
    request<any>(`/api/admin/audit-logs?page=${page}&size=${size}`),
  listDepartments: () => request<any[]>("/api/admin/departments"),
};

