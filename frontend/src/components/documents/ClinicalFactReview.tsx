import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type ExtractedFact,
  type FactType,
  type ConfirmFactDecision,
  type FactConfirmationSummary,
} from "../../api/client";

interface ClinicalFactReviewProps {
  documentId?: number;
  patientId?: number;
  onFactsConfirmed?: () => void;
  readOnly?: boolean;
}

const FACT_TYPE_CONFIG: Record<FactType, { label: string; icon: string; bg: string; text: string }> = {
  ENCOUNTER: { label: "Clinical Encounter", icon: "🩺", bg: "bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800", text: "text-blue-800 dark:text-blue-300" },
  DIAGNOSIS: { label: "Diagnosis / Condition", icon: "📋", bg: "bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800", text: "text-purple-800 dark:text-purple-300" },
  MEDICATION: { label: "Medication Regimen", icon: "💊", bg: "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800", text: "text-emerald-800 dark:text-emerald-300" },
  LAB_REPORT: { label: "Diagnostic Lab Value", icon: "🧪", bg: "bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800", text: "text-amber-800 dark:text-amber-300" },
  OBSERVATION: { label: "Clinical Observation", icon: "📊", bg: "bg-cyan-50 dark:bg-cyan-950/80 border-cyan-200 dark:border-cyan-800", text: "text-cyan-800 dark:text-cyan-300" },
};

export default function ClinicalFactReview({
  documentId,
  patientId,
  onFactsConfirmed,
  readOnly = false,
}: ClinicalFactReviewProps) {
  const { t } = useTranslation();
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);

  // Per-fact editing state
  const [editingFactId, setEditingFactId] = useState<number | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectingFactId, setRejectingFactId] = useState<number | null>(null);

  const loadFacts = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: ExtractedFact[] = [];
      if (documentId) {
        data = await api.getDocumentFacts(documentId);
      } else if (patientId) {
        data = await api.getPatientPendingFacts(patientId);
      }
      setFacts(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load clinical candidate facts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacts();
  }, [documentId, patientId]);

  // Group facts by document ID and fact type
  const pendingFacts = useMemo(() => facts.filter((f) => f.status === "PENDING"), [facts]);
  const reviewedFacts = useMemo(() => facts.filter((f) => f.status !== "PENDING"), [facts]);

  const hasNeedsReview = useMemo(
    () => facts.some((f) => f.confidenceLevel === "NEEDS_REVIEW" || f.confidenceLevel === "LOW_CONFIDENCE"),
    [facts]
  );

  const startEdit = (fact: ExtractedFact) => {
    setEditingFactId(fact.id);
    setEditedFields({ ...(fact.confirmedData || fact.extractedData) });
  };

  const cancelEdit = () => {
    setEditingFactId(null);
    setEditedFields({});
  };

  const handleConfirmSingle = async (fact: ExtractedFact, isEdit: boolean = false) => {
    setSubmitting(true);
    setSummaryMessage(null);
    try {
      const decision: ConfirmFactDecision = {
        factId: fact.id,
        action: isEdit ? "EDIT" : "CONFIRM",
        editedData: isEdit ? editedFields : null,
      };

      const docId = fact.documentId;
      const res: FactConfirmationSummary = await api.confirmDocumentFacts(docId, {
        decisions: [decision],
      });

      setSummaryMessage(res.message);
      cancelEdit();
      await loadFacts();
      if (onFactsConfirmed) onFactsConfirmed();
    } catch (e: any) {
      alert("Confirmation failed: " + (e?.message || "Error processing fact"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSingle = async (fact: ExtractedFact) => {
    setSubmitting(true);
    setSummaryMessage(null);
    try {
      const decision: ConfirmFactDecision = {
        factId: fact.id,
        action: "REJECT",
        rejectionReason: rejectionReason.trim() || "Rejected during human clinical review",
      };

      const res: FactConfirmationSummary = await api.confirmDocumentFacts(fact.documentId, {
        decisions: [decision],
      });

      setSummaryMessage(res.message);
      setRejectingFactId(null);
      setRejectionReason("");
      await loadFacts();
      if (onFactsConfirmed) onFactsConfirmed();
    } catch (e: any) {
      alert("Rejection failed: " + (e?.message || "Error rejecting fact"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAllPending = async () => {
    if (pendingFacts.length === 0) return;
    if (!confirm(`Are you sure you want to confirm all ${pendingFacts.length} candidate facts into the patient's EHR records?`)) {
      return;
    }

    setSubmitting(true);
    setSummaryMessage(null);
    try {
      // Group decisions by documentId
      const byDoc: Record<number, ConfirmFactDecision[]> = {};
      for (const f of pendingFacts) {
        if (!byDoc[f.documentId]) byDoc[f.documentId] = [];
        byDoc[f.documentId].push({
          factId: f.id,
          action: "CONFIRM",
        });
      }

      let totalConfirmed = 0;
      let totalSkipped = 0;
      for (const [docIdStr, decisions] of Object.entries(byDoc)) {
        const res = await api.confirmDocumentFacts(Number(docIdStr), { decisions });
        totalConfirmed += res.confirmedCount;
        totalSkipped += res.duplicatesSkipped;
      }

      setSummaryMessage(`Successfully confirmed ${totalConfirmed} facts into structured EHR (${totalSkipped} duplicate active records skipped).`);
      await loadFacts();
      if (onFactsConfirmed) onFactsConfirmed();
    } catch (e: any) {
      alert("Batch confirmation failed: " + (e?.message || "Error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        <span className="inline-block w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin mb-1"></span>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
        <span className="font-bold">Error:</span> {error}
      </div>
    );
  }

  if (facts.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
        {t("documents.factReview.noFacts")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Needs Review / OCR Warning Banner */}
      {hasNeedsReview && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <span className="text-base">⚠️</span>
          <div>
            <p className="font-bold">{t("documents.factReview.ocrWarning")}</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
              {t("documents.factReview.ocrWarningDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Summary Message Alert */}
      {summaryMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <span className="font-semibold">✓ {summaryMessage}</span>
          <button onClick={() => setSummaryMessage(null)} className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Pending Facts Header & Batch Action */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡️</span> {t("documents.factReview.title")} ({pendingFacts.length})
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t("documents.factReview.desc")}
          </p>
        </div>

        {!readOnly && pendingFacts.length > 0 && (
          <button
            onClick={handleConfirmAllPending}
            disabled={submitting}
            className="btn-tactile px-3 py-1.5 bg-teal text-white rounded-lg text-xs font-bold hover:bg-teal-dark transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            <span>✓</span> {t("documents.factReview.confirmAll")} ({pendingFacts.length})
          </button>
        )}
      </div>

      {/* Pending Facts Cards */}
      {pendingFacts.length > 0 ? (
        <div className="space-y-3">
          {pendingFacts.map((fact) => {
            const cfg = FACT_TYPE_CONFIG[fact.factType] || {
              label: fact.factType,
              icon: "📄",
              bg: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
              text: "text-slate-800 dark:text-slate-200",
            };
            const isEditing = editingFactId === fact.id;
            const isRejecting = rejectingFactId === fact.id;
            const data = fact.extractedData || {};

            return (
              <div
                key={fact.id}
                className={`p-4 rounded-xl border transition-all ${
                  isEditing
                    ? "border-teal/50 bg-teal-50/20 dark:bg-teal-950/30"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bg} ${cfg.text}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{fact.fieldName}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {fact.confidenceLevel === "NEEDS_REVIEW" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Needs Review
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      PENDING
                    </span>
                  </div>
                </div>

                {/* Inline Editing Mode */}
                {isEditing ? (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-teal">Edit Fact Before Confirmation:</div>

                    {fact.factType === "DIAGNOSIS" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Condition Description</label>
                          <input
                            type="text"
                            value={editedFields.description || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, description: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">ICD-10 Code</label>
                          <input
                            type="text"
                            value={editedFields.code || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, code: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {fact.factType === "MEDICATION" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Medication Name</label>
                          <input
                            type="text"
                            value={editedFields.medicationName || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, medicationName: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Dosage</label>
                          <input
                            type="text"
                            value={editedFields.dosage || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, dosage: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Frequency</label>
                          <input
                            type="text"
                            value={editedFields.frequency || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, frequency: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {fact.factType === "LAB_REPORT" && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Test Name</label>
                          <input
                            type="text"
                            value={editedFields.testName || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, testName: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Result Value</label>
                          <input
                            type="text"
                            value={editedFields.resultValue || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, resultValue: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Unit</label>
                          <input
                            type="text"
                            value={editedFields.unit || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, unit: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Flag</label>
                          <select
                            value={editedFields.flag || "NORMAL"}
                            onChange={(e) => setEditedFields({ ...editedFields, flag: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          >
                            <option value="NORMAL">NORMAL</option>
                            <option value="HIGH">HIGH</option>
                            <option value="LOW">LOW</option>
                            <option value="CRITICAL">CRITICAL</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {fact.factType === "ENCOUNTER" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Encounter Type</label>
                          <select
                            value={editedFields.encounterType || "OUTPATIENT"}
                            onChange={(e) => setEditedFields({ ...editedFields, encounterType: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          >
                            <option value="OUTPATIENT">Outpatient Visit</option>
                            <option value="INPATIENT">Inpatient Admission</option>
                            <option value="EMERGENCY">Emergency Department</option>
                            <option value="FOLLOW_UP">Follow-Up Consult</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Chief Complaint</label>
                          <input
                            type="text"
                            value={editedFields.chiefComplaint || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, chiefComplaint: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Clinical Summary / Notes</label>
                          <textarea
                            rows={2}
                            value={editedFields.clinicalNotes || ""}
                            onChange={(e) => setEditedFields({ ...editedFields, clinicalNotes: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={cancelEdit}
                        className="btn-tactile px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleConfirmSingle(fact, true)}
                        disabled={submitting}
                        className="btn-tactile px-3 py-1.5 text-xs font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark disabled:opacity-50"
                      >
                        Save & Confirm
                      </button>
                    </div>
                  </div>
                ) : isRejecting ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 block">
                      Rejection Reason (Audit Trail):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Duplicate entry, incorrect reading, or not clinically applicable"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setRejectingFactId(null); setRejectionReason(""); }}
                        className="btn-tactile px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRejectSingle(fact)}
                        disabled={submitting}
                        className="btn-tactile px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Extracted Fact Details */
                  <div className="space-y-2">
                    <div className="text-xs text-slate-700 dark:text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                      {Object.entries(data).map(([k, v]) => {
                        if (k === "documentTitle" || k === "clinicalNotes" || k === "assessmentPlan") return null;
                        return (
                          <div key={k} className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-100 dark:border-slate-700/80">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">{k}</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate block">{String(v || "—")}</span>
                          </div>
                        );
                      })}
                    </div>

                    {data.clinicalNotes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-slate-50/50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        "{data.clinicalNotes}"
                      </p>
                    )}

                    {/* Provenance Text */}
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between pt-1">
                      <span>{fact.provenanceText}</span>
                      <span>Extracted: {new Date(fact.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Action Buttons */}
                    {!readOnly && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => setRejectingFactId(fact.id)}
                          disabled={submitting}
                          className="btn-tactile px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => startEdit(fact)}
                          disabled={submitting}
                          className="btn-tactile px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleConfirmSingle(fact, false)}
                          disabled={submitting}
                          className="btn-tactile px-3 py-1 text-xs font-semibold bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <span>✓</span> All candidate facts for this record have been confirmed or reviewed.
        </div>
      )}

      {/* Confirmed / Historical Facts History */}
      {reviewedFacts.length > 0 && (
        <details className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/40 dark:bg-slate-800/40 text-xs mt-4">
          <summary className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 select-none">
            Reviewed Clinical Facts History ({reviewedFacts.length} items)
          </summary>
          <div className="mt-3 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            {reviewedFacts.map((fact) => (
              <div key={fact.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    fact.status === "CONFIRMED" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" :
                    fact.status === "EDITED" ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300" :
                    "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                  }`}>
                    {fact.status}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{fact.fieldName}</span>
                  {fact.canonicalEntityType && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      → {fact.canonicalEntityType} #{fact.canonicalEntityId}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {fact.reviewedByUserName ? `By ${fact.reviewedByUserName}` : ""}
                  {fact.reviewedAt ? ` on ${new Date(fact.reviewedAt).toLocaleDateString()}` : ""}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
