import React, { useEffect, useState, useMemo } from "react";
import {
  api,
  type DocumentItem,
  type DocumentDetail,
  type Doctor,
} from "../../api/client";
import ClinicalFactReview from "./ClinicalFactReview";

export interface DocumentCenterProps {
  patientId: number;
  canUpload?: boolean;
  canShare?: boolean;
  canArchive?: boolean;
  canEdit?: boolean;
}

const CATEGORY_MAP: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  LABORATORY_REPORT: { label: "Lab Report", bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", icon: "🧪" },
  PRESCRIPTION: { label: "Prescription", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", icon: "💊" },
  IMAGING_REPORT: { label: "Imaging", bg: "bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300", icon: "🔬" },
  DISCHARGE_SUMMARY: { label: "Discharge Summary", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800", text: "text-amber-800 dark:text-amber-300", icon: "📋" },
  PREVIOUS_CONSULTATION: { label: "Consultation", bg: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-800", text: "text-cyan-800 dark:text-cyan-300", icon: "🩺" },
  MEDICAL_CERTIFICATE: { label: "Medical Certificate", bg: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", icon: "📜" },
  DIAGNOSIS_REPORT: { label: "Previous Record", bg: "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", icon: "📁" },
  OTHER: { label: "Other", bg: "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700", text: "text-slate-700 dark:text-slate-300", icon: "📄" },
};

export interface ParsedClinicalEntities {
  documentType?: string;
  summary?: string;
  labResults?: Array<{ test: string; value: string; unit?: string; flag?: string }>;
  medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
  diagnosesMentioned?: string[];
  symptomsMentioned?: string;
  uncertainItems?: string[];
}

export function parseClinicalEntities(rawJson?: string | null): ParsedClinicalEntities | null {
  if (!rawJson) return null;
  try {
    const data = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
    return {
      documentType: data.documentType,
      summary: data.summary,
      labResults: Array.isArray(data.labResults)
        ? data.labResults.map((lr: any) => ({
            test: lr.test || lr.testName || "Test",
            value: lr.value || lr.result || "",
            unit: lr.unit || lr.units || "",
            flag: lr.flag || "NORMAL",
          }))
        : [],
      medications: Array.isArray(data.medications)
        ? data.medications.map((m: any) =>
            typeof m === "string"
              ? { name: m }
              : { name: m.name || m.medicationName || "Medication", dosage: m.dosage, frequency: m.frequency }
          )
        : [],
      diagnosesMentioned: Array.isArray(data.diagnosesMentioned) ? data.diagnosesMentioned : [],
      symptomsMentioned: typeof data.symptomsMentioned === "string" ? data.symptomsMentioned : "Not detected",
      uncertainItems: Array.isArray(data.uncertainItems) ? data.uncertainItems : [],
    };
  } catch {
    return null;
  }
}

export default function DocumentCenter({
  patientId,
  canUpload = true,
  canShare = true,
  canArchive = true,
  canEdit = true,
}: DocumentCenterProps) {

  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pageInfo, setPageInfo] = useState({ pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("uploadedAt,desc");

  // Doctors for sharing
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [contactAdminDoc, setContactAdminDoc] = useState<DocumentItem | null>(null);

  // Selected document for modal actions
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docDetail, setDocDetail] = useState<DocumentDetail | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("LABORATORY_REPORT");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Load documents
  const loadDocuments = async (page: number = pageInfo.pageNumber) => {
    setLoading(true);
    setError(null);
    try {
      const catParam = selectedCategory === "ALL" ? undefined : selectedCategory;
      const searchParam = searchQuery.trim() || undefined;

      const res = await api.listDocumentsPaged(patientId, {
        category: catParam,
        search: searchParam,
        page,
        size: pageInfo.pageSize,
      });

      setDocuments(res.content || []);
      setPageInfo({
        pageNumber: res.pageNumber,
        pageSize: res.pageSize,
        totalElements: res.totalElements,
        totalPages: res.totalPages,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load clinical documents.");
    } finally {
      setLoading(false);
    }
  };

  // Load doctors for sharing dialog
  useEffect(() => {
    api.listDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, []);

  // Trigger reload on filter or search change (reset to page 0)
  useEffect(() => {
    loadDocuments(0);
  }, [patientId, selectedCategory, searchQuery]);

  // Clean up preview object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Formatted file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Human date formatter
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

  // Supported extensions validator
  const isValidFileType = (filename: string): boolean => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return ["pdf", "jpg", "jpeg", "png", "doc", "docx"].includes(ext || "");
  };

  // Handle file select in upload modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFileType(file.name)) {
      alert("Invalid file format. Supported: PDF, JPG, JPEG, PNG, DOC, DOCX.");
      e.target.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("File exceeds maximum allowed size of 20 MB.");
      e.target.value = "";
      return;
    }

    setUploadFile(file);
    if (!uploadTitle) {
      const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      setUploadTitle(baseName);
    }
  };

  // Submit upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadProgress("Uploading clinical file...");
    try {
      setUploadProgress("Validating security & processing metadata...");
      await api.uploadDocument(
        patientId,
        uploadFile,
        uploadCategory,
        uploadDesc,
        uploadTitle
      );
      setUploadProgress("Finalizing upload...");
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadDesc("");
      loadDocuments(0);
    } catch (err: any) {
      alert(err.message || "Upload failed. Please check file format and permissions.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // Open Preview Modal
  const handlePreview = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setShowPreviewModal(true);
    setPreviewLoading(true);
    try {
      const url = await api.previewDocument(doc.id);
      setPreviewUrl(url);
    } catch (err: any) {
      alert("Could not load preview: " + (err.message || "File unavailable"));
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title || doc.fileName);
    setEditCategory(doc.category || "OTHER");
    setEditDesc(doc.description || "");
    setShowEditModal(true);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    setSavingEdit(true);
    try {
      await api.updateDocument(selectedDoc.id, {
        title: editTitle,
        category: editCategory,
        description: editDesc,
      });
      setShowEditModal(false);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to update document metadata.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Share Modal
  const handleOpenShare = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setShowShareModal(true);
  };

  // Share with Doctor
  const handleShareWithDoctor = async (doctorId: number) => {
    if (!selectedDoc) return;
    try {
      const updated = await api.shareDocument(selectedDoc.id, doctorId);
      setSelectedDoc(updated);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to share document.");
    }
  };

  // Revoke Share
  const handleRevokeShare = async (doctorId: number) => {
    if (!selectedDoc) return;
    try {
      const updated = await api.revokeDocumentShare(selectedDoc.id, doctorId);
      setSelectedDoc(updated);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to revoke share.");
    }
  };

  // Open Archive Confirm
  const handleOpenArchive = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setShowArchiveConfirm(true);
  };

  // Confirm Archive
  const handleConfirmArchive = async () => {
    if (!selectedDoc) return;
    try {
      await api.archiveDocument(selectedDoc.id);
      setShowArchiveConfirm(false);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to archive document.");
    }
  };

  // View AI Analysis
  const handleViewAiAnalysis = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setShowAiModal(true);
    try {
      const detail = await api.getDocumentDetail(doc.id);
      setDocDetail(detail);
    } catch (err: any) {
      alert("Failed to load AI clinical analysis: " + err.message);
    }
  };

  // Sorted documents
  const sortedDocuments = useMemo(() => {
    const list = [...documents];
    const [field, dir] = sortBy.split(",");
    list.sort((a, b) => {
      let comparison = 0;
      if (field === "uploadedAt") {
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      } else if (field === "title") {
        const titleA = (a.title || a.fileName).toLowerCase();
        const titleB = (b.title || b.fileName).toLowerCase();
        comparison = titleA.localeCompare(titleB);
      } else if (field === "fileSize") {
        comparison = a.fileSize - b.fileSize;
      }
      return dir === "desc" ? -comparison : comparison;
    });
    return list;
  }, [documents, sortBy]);

  return (
    <div className="space-y-6">
      {/* Document Center Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal/10 dark:bg-teal-950/50 text-teal dark:text-teal-400 flex items-center justify-center font-bold text-lg">
              📄
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Clinical Document Center</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure medical document repository with AI analysis and granular consent controls.
              </p>
            </div>
          </div>
        </div>

        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-tactile focus-ring inline-flex items-center gap-2 px-4 py-2.5 bg-teal text-white font-semibold text-sm rounded-xl hover:bg-teal-dark shadow-xs transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Upload Clinical Document
          </button>
        )}
      </div>

      {/* Search, Filter Pills & Sort Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by document title, filename, or clinical notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus-ring bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus-ring"
            >
              <option value="uploadedAt,desc">Newest First</option>
              <option value="uploadedAt,asc">Oldest First</option>
              <option value="title,asc">Title (A - Z)</option>
              <option value="fileSize,desc">File Size (Largest)</option>
            </select>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`btn-tactile px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
              selectedCategory === "ALL"
                ? "bg-teal text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All Categories
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`btn-tactile px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === key
                  ? "bg-teal text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadDocuments()} className="underline font-semibold ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Document List / Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-teal border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium">Loading clinical documents...</p>
        </div>
      ) : sortedDocuments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-2xl mb-4">
            📂
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No Documents Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            {searchQuery || selectedCategory !== "ALL"
              ? "No documents match your active search filter. Try clearing the filter."
              : "No clinical documents have been uploaded to this chart yet."}
          </p>
          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-tactile focus-ring mt-4 px-4 py-2 bg-teal text-white text-xs font-semibold rounded-lg hover:bg-teal-dark shadow-xs"
            >
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Document Title & File</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-4">Processing</th>
                  <th className="py-3.5 px-4">AI Analysis</th>
                  <th className="py-3.5 px-4">Sharing</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedDocuments.map((doc) => {
                  const catInfo = CATEGORY_MAP[doc.category] || CATEGORY_MAP.OTHER;
                  const isShared = doc.sharingStatus === "SHARED" || (doc.sharedWithDoctorIds && doc.sharedWithDoctorIds.length > 0);
                  const isRemovedByAdmin = doc.adminStatus === "REMOVED_BY_ADMIN";

                  return (
                    <tr key={doc.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors ${isRemovedByAdmin ? "bg-rose-50/30 dark:bg-rose-950/20" : ""}`}>
                      {/* Title & File */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <span className="text-xl mt-0.5">{catInfo.icon}</span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold block text-sm ${isRemovedByAdmin ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-900 dark:text-slate-100"}`}>
                                {doc.title || doc.fileName}
                              </span>
                              {isRemovedByAdmin && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  <span>⛔</span>
                                  <span>Removed by Admin</span>
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 text-xs block">
                              {doc.originalFilename || doc.fileName} • {formatFileSize(doc.fileSize)}
                            </span>
                            {isRemovedByAdmin ? (
                              <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 max-w-md">
                                <span className="font-semibold block text-[11px] uppercase tracking-wider text-rose-700 dark:text-rose-300">
                                  Administrative Governance Notice
                                </span>
                                <p className="mt-0.5 font-medium">{doc.removalReason || "Administrative governance policy / unverified clinical artifact"}</p>
                              </div>
                            ) : (
                              doc.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">{doc.description}</p>
                              )
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${catInfo.bg} ${catInfo.text}`}>
                          {catInfo.label}
                        </span>
                      </td>

                      {/* Uploaded */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div>{formatDate(doc.uploadedAt)}</div>
                        <span className="text-[11px] text-slate-400">{doc.uploadedByName}</span>
                      </td>

                      {/* Processing Status */}
                      <td className="py-3.5 px-4">
                        {isRemovedByAdmin ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-200 dark:border-rose-800">
                            ⛔ Restricted
                          </span>
                        ) : doc.processingStatus === "READY" || doc.processingStatus === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                            ✓ Ready
                          </span>
                        ) : doc.processingStatus === "PROCESSING" ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200 dark:border-amber-800 animate-pulse">
                            ⏳ Processing...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-200 dark:border-rose-800">
                            ⚠ Failed
                          </span>
                        )}
                      </td>

                      {/* AI Status */}
                      <td className="py-3.5 px-4">
                        {isRemovedByAdmin ? (
                          <span className="text-slate-400 text-xs italic">Unavailable</span>
                        ) : (
                          <button
                            onClick={() => handleViewAiAnalysis(doc)}
                            className="btn-tactile inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-colors"
                          >
                            <span>📋</span>
                            <span>{doc.aiStatus === "COMPLETED" ? "Insights Ready" : "Analyzing..."}</span>
                          </button>
                        )}
                      </td>

                      {/* Sharing Status */}
                      <td className="py-3.5 px-4">
                        {isRemovedByAdmin ? (
                          <span className="text-slate-400 text-xs italic">Revoked</span>
                        ) : isShared ? (
                          <span
                            title={doc.sharedWithDoctorNames ? `Shared with: ${doc.sharedWithDoctorNames.join(", ")}` : "Shared with clinical team"}
                            className="inline-flex items-center gap-1 text-teal dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-md text-xs font-semibold border border-teal-200 dark:border-teal-800 cursor-help"
                          >
                            <span>👥</span>
                            <span>Shared ({doc.sharedWithDoctorIds?.length || 1})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-700">
                            <span>🔒</span>
                            <span>Private</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {isRemovedByAdmin ? (
                            <button
                              onClick={() => setContactAdminDoc(doc)}
                              title="Contact Administrator"
                              className="btn-tactile px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                              <span>🛡️</span>
                              <span>Contact Admin</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handlePreview(doc)}
                                title="Preview Document"
                                className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-teal dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => api.downloadDocument(doc.id, doc.originalFilename || doc.fileName)}
                                title="Download Document"
                                className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                ⬇️
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => handleOpenEdit(doc)}
                                  title="Rename / Categorize"
                                  className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  ✏️
                                </button>
                              )}
                              {canShare && (
                                <button
                                  onClick={() => handleOpenShare(doc)}
                                  title="Manage Doctor Sharing"
                                  className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  🔗
                                </button>
                              )}
                              {canArchive && (
                                <button
                                  onClick={() => handleOpenArchive(doc)}
                                  title="Archive Document"
                                  className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  🗑️
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Adaptive Cards View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {sortedDocuments.map((doc) => {
              const catInfo = CATEGORY_MAP[doc.category] || CATEGORY_MAP.OTHER;
              const isShared = doc.sharingStatus === "SHARED" || (doc.sharedWithDoctorIds && doc.sharedWithDoctorIds.length > 0);
              const isRemovedByAdmin = doc.adminStatus === "REMOVED_BY_ADMIN";

              return (
                <div key={doc.id} className={`bg-white dark:bg-slate-900 border ${isRemovedByAdmin ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/20" : "border-slate-200 dark:border-slate-800"} rounded-2xl p-4 shadow-xs space-y-3`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{catInfo.icon}</span>
                      <div>
                        <h4 className={`text-sm font-bold line-clamp-1 ${isRemovedByAdmin ? "text-slate-500 line-through" : "text-slate-900 dark:text-slate-100"}`}>
                          {doc.title || doc.fileName}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${catInfo.bg} ${catInfo.text}`}>
                      {catInfo.label}
                    </span>
                  </div>

                  {isRemovedByAdmin ? (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
                        <span>⛔</span>
                        <span>Removed by Administrator</span>
                      </div>
                      <p className="font-medium">{doc.removalReason || "Administrative governance policy / unverified clinical artifact"}</p>
                      <button
                        onClick={() => setContactAdminDoc(doc)}
                        className="btn-tactile mt-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg w-full text-center"
                      >
                        Contact Administrator
                      </button>
                    </div>
                  ) : (
                    doc.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                        {doc.description}
                      </p>
                    )
                  )}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {isRemovedByAdmin ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-200 dark:border-rose-800">
                          ⛔ Restricted
                        </span>
                      ) : (
                        <>
                          {isShared ? (
                            <span className="inline-flex items-center gap-1 text-teal dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded text-[11px] font-semibold border border-teal-200 dark:border-teal-800">
                              👥 Shared
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                              🔒 Private
                            </span>
                          )}
                          <button
                            onClick={() => handleViewAiAnalysis(doc)}
                            className="btn-tactile text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-200 dark:border-purple-800"
                          >
                            📋 Insights
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isRemovedByAdmin ? (
                        <button
                          onClick={() => setContactAdminDoc(doc)}
                          className="btn-tactile px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg"
                        >
                          🛡️ Contact Admin
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handlePreview(doc)}
                            className="btn-tactile p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs"
                          >
                            👁️ Preview
                          </button>
                          <button
                            onClick={() => api.downloadDocument(doc.id, doc.originalFilename || doc.fileName)}
                            className="btn-tactile p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg text-xs"
                          >
                            ⬇️ Save
                          </button>
                          {canShare && (
                            <button
                              onClick={() => handleOpenShare(doc)}
                              className="btn-tactile p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg text-xs"
                            >
                              🔗 Share
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Server-Side Pagination Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div>
              Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{sortedDocuments.length}</span> of{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{pageInfo.totalElements}</span> documents
              {pageInfo.totalPages > 1 && (
                <span className="ml-1 text-slate-400">
                  (Page {pageInfo.pageNumber + 1} of {pageInfo.totalPages})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pageInfo.pageNumber === 0 || loading}
                onClick={() => loadDocuments(pageInfo.pageNumber - 1)}
                className="btn-tactile px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={pageInfo.pageNumber >= pageInfo.totalPages - 1 || loading}
                onClick={() => loadDocuments(pageInfo.pageNumber + 1)}
                className="btn-tactile px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Upload Document */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upload Clinical Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Medical File (PDF, JPG, PNG, DOC, DOCX up to 20MB)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal/10 dark:file:bg-teal-950/40 file:text-teal dark:file:text-teal-300 hover:file:bg-teal/20 cursor-pointer border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800"
                />
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Comprehensive Metabolic Panel - Sept 2026"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus-ring bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Clinical Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-ring"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.icon} {info.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Clinical Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fasting blood work drawn prior to appointment..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus-ring bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              {/* Progress Indicator */}
              {uploading && (
                <div className="bg-teal/10 dark:bg-teal-950/40 border border-teal/20 dark:border-teal-800 rounded-xl p-3 text-xs text-teal dark:text-teal-300 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                  <span>{uploadProgress || "Uploading..."}</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setShowUploadModal(false)}
                  className="btn-tactile px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="btn-tactile focus-ring px-5 py-2 text-xs font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark disabled:opacity-50 transition-all shadow-xs"
                >
                  {uploading ? "Uploading..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Rename & Categorize */}
      {/* ========================================================================= */}
      {showEditModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Document Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus-ring bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-ring"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.icon} {info.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus-ring bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setShowEditModal(false)}
                  className="btn-tactile px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-tactile focus-ring px-5 py-2 text-xs font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark shadow-xs"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Share Document with Doctor */}
      {/* ========================================================================= */}
      {showShareModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Manage Document Access</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  File: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedDoc.title || selectedDoc.fileName}</span>
                </p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Attending Clinical Staff
              </h4>

              {doctors.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No doctors found in clinic directory.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto pr-1">
                  {doctors.map((doc) => {
                    const isSharedWithDoc = selectedDoc.sharedWithDoctorIds?.includes(doc.id);

                    return (
                      <div key={doc.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{doc.fullName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {doc.specialization} • {doc.departmentName || "General Medicine"}
                          </p>
                        </div>

                        {isSharedWithDoc ? (
                          <button
                            onClick={() => handleRevokeShare(doc.id)}
                            className="btn-tactile px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-colors"
                          >
                            Revoke Share
                          </button>
                        ) : (
                          <button
                            onClick={() => handleShareWithDoctor(doc.id)}
                            className="btn-tactile px-3 py-1.5 text-xs font-semibold text-teal dark:text-teal-300 bg-teal/10 dark:bg-teal-950/40 hover:bg-teal/20 dark:hover:bg-teal-900/60 rounded-lg transition-colors"
                          >
                            Share Access
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 border border-slate-200 dark:border-slate-700">
              <span className="text-base">🛡️</span>
              <p>
                Sharing grants the specified doctor view and download access to this document. All access events are recorded in the patient's immutable audit log.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="btn-tactile px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Document Safe Preview */}
      {/* ========================================================================= */}
      {showPreviewModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedDoc.title || selectedDoc.fileName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDoc.contentType} • {formatFileSize(selectedDoc.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => api.downloadDocument(selectedDoc.id, selectedDoc.originalFilename || selectedDoc.fileName)}
                  className="btn-tactile px-3 py-1.5 bg-teal text-white rounded-lg text-xs font-semibold hover:bg-teal-dark flex items-center gap-1 shadow-xs"
                >
                  <span>⬇️</span> Download File
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 overflow-auto flex items-center justify-center">
              {previewLoading ? (
                <div className="text-center text-slate-400">
                  <div className="inline-block animate-spin w-8 h-8 border-4 border-teal border-t-transparent rounded-full mb-2" />
                  <p className="text-xs font-semibold">Loading secure document preview...</p>
                </div>
              ) : previewUrl ? (
                selectedDoc.contentType?.includes("pdf") ? (
                  <iframe
                    src={previewUrl}
                    title="PDF Document Preview"
                    className="w-full h-full bg-white dark:bg-slate-900 rounded-xl shadow-inner border border-slate-200 dark:border-slate-800"
                  />
                ) : selectedDoc.contentType?.includes("image") ? (
                  <img
                    src={previewUrl}
                    alt={selectedDoc.title}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-sm bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800"
                  />
                ) : (
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm max-w-md text-center space-y-3 border border-slate-200 dark:border-slate-800">
                    <span className="text-4xl">📄</span>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">Word Document Preview</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      DOC and DOCX files require client-side word processors. Click below to download and view the original file safely.
                    </p>
                    <button
                      onClick={() => api.downloadDocument(selectedDoc.id, selectedDoc.originalFilename || selectedDoc.fileName)}
                      className="btn-tactile px-4 py-2 bg-teal text-white rounded-lg text-xs font-semibold hover:bg-teal-dark shadow-xs"
                    >
                      Download Document
                    </button>
                  </div>
                )
              ) : (
                <div className="text-slate-400 text-xs">Preview unavailable.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 5: AI Insights / Clinical Extraction */}
      {/* ========================================================================= */}
      {showAiModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal/10 dark:bg-teal-950/50 text-teal dark:text-teal-400 flex items-center justify-center text-lg font-bold">
                  📋
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Clinical Document Analysis</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Extracted findings from <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDoc.title || selectedDoc.fileName}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-lg">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {docDetail?.aiAnalysis ? (() => {
                const parsed = parseClinicalEntities(docDetail.aiAnalysis?.structuredResultJson || docDetail.aiAnalysis?.entitiesJson);
                const labResults = parsed?.labResults || [];
                const medications = parsed?.medications || [];
                const diagnoses = parsed?.diagnosesMentioned || [];
                const symptoms = parsed?.symptomsMentioned || "Not detected";
                const uncertainItems = parsed?.uncertainItems || [];

                return (
                  <>
                    {/* Metadata strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">Classification</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {docDetail.aiAnalysis.reportType || selectedDoc.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">Analysis Type</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm font-bold text-teal dark:text-teal-400">
                            AI Document Analysis
                          </span>
                          <details className="inline-block relative text-left">
                            <summary className="cursor-pointer text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium underline list-none">
                              (Engine Details)
                            </summary>
                            <div className="absolute left-0 top-full mt-1 z-20 w-56 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg text-[11px] text-slate-700 dark:text-slate-300">
                              <span className="font-semibold block text-slate-900 dark:text-white mb-0.5">Provider:</span>
                              {docDetail.aiAnalysis.modelProvider ? `${docDetail.aiAnalysis.modelProvider} (${docDetail.aiAnalysis.modelVersion || "local"})` : "Ollama (llama3.2:1b)"}
                            </div>
                          </details>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">Status</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full mt-0.5">
                          ● {docDetail.aiAnalysis.status || docDetail.aiStatus || "READY"}
                        </span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span>📝</span> Grounded Clinical Summary
                      </h4>
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                        {docDetail.aiAnalysis.summaryText}
                      </p>
                    </div>

                    {/* Lab Results Table */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="bg-slate-100/80 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🧪</span> Identified Lab Values ({labResults.length})
                        </h4>
                      </div>
                      {labResults.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="px-4 py-2">Test Name</th>
                                <th className="px-4 py-2">Result Value</th>
                                <th className="px-4 py-2">Unit</th>
                                <th className="px-4 py-2">Clinical Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                              {labResults.map((lr, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{lr.test}</td>
                                  <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">{lr.value}</td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{lr.unit || "—"}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                      lr.flag === "HIGH" || lr.flag === "CRITICAL"
                                        ? "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300"
                                        : lr.flag === "LOW"
                                        ? "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300"
                                        : lr.flag === "ABNORMAL"
                                        ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    }`}>
                                      {lr.flag || "NORMAL"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                          No quantitative laboratory test values detected in document.
                        </div>
                      )}
                    </div>

                    {/* Detected Medications & Diagnoses Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Medications */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800/60">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span>💊</span> Detected Medications ({medications.length})
                        </h4>
                        {medications.length > 0 ? (
                          <div className="space-y-2">
                            {medications.map((m, idx) => (
                              <div key={idx} className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 text-xs">
                                <div className="font-bold text-emerald-950 dark:text-emerald-200">{m.name}</div>
                                <div className="text-emerald-800 dark:text-emerald-400 text-[11px] mt-0.5">
                                  {m.dosage && <span className="mr-2">Dose: {m.dosage}</span>}
                                  {m.frequency && <span>Freq: {m.frequency}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No medications detected.</p>
                        )}
                      </div>

                      {/* Diagnoses & Conditions */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800/60">
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span>📋</span> Diagnoses & Conditions ({diagnoses.length})
                        </h4>
                        {diagnoses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {diagnoses.map((d, idx) => (
                              <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 text-xs font-medium">
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No explicit diagnoses detected.</p>
                        )}

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block mb-1">Symptoms Noted</span>
                          <span className="text-xs text-slate-700 dark:text-slate-300">{symptoms}</span>
                        </div>
                      </div>
                    </div>

                    {/* Uncertain Items if any */}
                    {uncertainItems.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200">
                        <span className="font-bold block mb-1">⚠️ Ambiguous or Low-Confidence Terms:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                          {uncertainItems.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Collapsible Extracted Raw Text */}
                    {docDetail.extractedText && (
                      <details className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/40 text-xs">
                        <summary className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 select-none">
                          View Extracted Raw Text (OCR / PDF)
                        </summary>
                        <pre className="mt-2.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                          {docDetail.extractedText}
                        </pre>
                      </details>
                    )}

                    {/* Mandatory Clinical Advisory Disclaimer */}
                    <div className="bg-teal/5 dark:bg-teal-950/30 border border-teal/20 dark:border-teal-800/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                      <span className="text-base">🛡️</span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Clinical Decision Support Advisory</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                          {docDetail.aiAnalysis.disclaimer || "Research decision-support only. This is not a medical diagnosis or treatment recommendation. Always cross-reference AI-extracted findings with the original uploaded document."}
                        </p>
                      </div>
                    </div>

                    {/* Safe Clinical Fact Normalization & Review Bridge */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
                      <ClinicalFactReview
                        documentId={docDetail.id}
                        onFactsConfirmed={() => {
                          loadDocuments();
                        }}
                      />
                    </div>
                  </>
                );
              })() : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs space-y-2">
                  <span className="text-3xl block">⏳</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">AI analysis is processing or temporarily unavailable.</p>
                  <p className="text-slate-500 dark:text-slate-400">You can still review and download the original uploaded document.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {docDetail && (
                <button
                  onClick={async () => {
                    try {
                      await api.downloadDocument(docDetail.id, docDetail.fileName || docDetail.title || "document");
                    } catch (e: any) {
                      alert("Failed to download document: " + (e?.message || "Access denied"));
                    }
                  }}
                  className="btn-tactile px-4 py-2 text-xs font-semibold bg-teal/10 dark:bg-teal-950/50 text-teal dark:text-teal-300 hover:bg-teal/20 dark:hover:bg-teal-900/50 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <span>📄</span> Download / View Original Source File
                </button>
              )}
              <button
                onClick={() => setShowAiModal(false)}
                className="btn-tactile px-5 py-2 text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: Archive Confirmation */}
      {/* ========================================================================= */}
      {showArchiveConfirm && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto">
              🗑️
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Archive Clinical Document?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to archive <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedDoc.title || selectedDoc.fileName}</span>?
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5">Audit Trail Guarantee:</p>
              <p>
                In compliance with medical record retention regulations, the file is archived non-destructively and removed from active charts, while preserving full audit history.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="btn-tactile px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                className="btn-tactile px-5 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: Contact Administrator (Document Governance) */}
      {/* ========================================================================= */}
      {contactAdminDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <span className="text-xl">🛡️</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Document Governance Notice</h3>
              </div>
              <button
                onClick={() => setContactAdminDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Document</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{contactAdminDoc.title || contactAdminDoc.fileName}</span>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">Administrative Reason</span>
                <p className="text-rose-800 dark:text-rose-200 font-medium">
                  {contactAdminDoc.removalReason || "Administrative governance policy / unverified clinical artifact"}
                </p>
                {contactAdminDoc.removedAt && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 pt-1">
                    Action recorded: {formatDate(contactAdminDoc.removedAt)}
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">How to Request Document Review / Restoration:</span>
                <p>If you believe this record was removed in error or have updated clinical documentation, please contact Hospital Records Governance:</p>
                <div className="pt-1.5 space-y-1 text-xs">
                  <p><span className="font-semibold text-slate-700 dark:text-slate-300">Email:</span> <a href={`mailto:admin@consentcare.hospital?subject=Document%20Restoration%20Appeal%20DOC-%23${contactAdminDoc.id}`} className="text-teal hover:underline font-mono">admin@consentcare.hospital</a></p>
                  <p><span className="font-semibold text-slate-700 dark:text-slate-300">Reference:</span> <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono">DOC-{contactAdminDoc.id}</code></p>
                  <p><span className="font-semibold text-slate-700 dark:text-slate-300">Direct Desk:</span> Health Information Management Desk (Ext 401)</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setContactAdminDoc(null)}
                className="btn-tactile px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
