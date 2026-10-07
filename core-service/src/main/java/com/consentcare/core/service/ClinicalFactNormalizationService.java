package com.consentcare.core.service;

import com.consentcare.core.dto.FactDtos.*;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import com.consentcare.core.security.ConsentSecurityEvaluator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicalFactNormalizationService {

    private final DocumentExtractedFactRepository factRepository;
    private final DocumentRepository documentRepository;
    private final DocumentShareRepository documentShareRepository;
    private final AiDocumentAnalysisRepository aiAnalysisRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final EncounterRepository encounterRepository;
    private final DiagnosisRepository diagnosisRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final LabReportRepository labReportRepository;
    private final AuditService auditService;
    private final ConsentSecurityEvaluator securityEvaluator;
    private final ObjectMapper objectMapper;

    /**
     * Staging step: parses Document AI analysis into candidate facts with PENDING review status.
     * Candidate facts are NEVER written into canonical EHR tables until explicitly confirmed by a human.
     */
    @Transactional
    public List<DocumentExtractedFact> createCandidateFactsFromAnalysis(Document doc, AiDocumentAnalysis analysis) {
        if (doc == null || analysis == null) return List.of();

        if (factRepository.existsByDocumentId(doc.getId())) {
            return factRepository.findByDocumentIdOrderByCreatedAtAsc(doc.getId());
        }

        String jsonStr = analysis.getStructuredResultJson();
        if (jsonStr == null || jsonStr.isBlank()) {
            jsonStr = analysis.getEntitiesJson();
        }
        if (jsonStr == null || jsonStr.isBlank()) {
            return List.of();
        }

        String confidenceLevel = "STANDARD";
        if ("NEEDS_REVIEW".equalsIgnoreCase(analysis.getStatus())) {
            confidenceLevel = "NEEDS_REVIEW";
        } else if (analysis.getConfidenceScore() != null && analysis.getConfidenceScore().doubleValue() < 0.70) {
            confidenceLevel = "LOW_CONFIDENCE";
        }

        List<DocumentExtractedFact> stagedFacts = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(jsonStr);

            // 1. Candidate Encounter Fact (The visit or clinical evaluation documented)
            String docType = root.path("documentType").asText(doc.getCategory().name().replace("_", " "));
            String summary = root.path("summary").asText(analysis.getSummaryText());
            String encounterType = determineEncounterType(doc.getCategory(), docType);

            Map<String, Object> encData = new LinkedHashMap<>();
            encData.put("encounterType", encounterType);
            encData.put("chiefComplaint", doc.getTitle() != null ? doc.getTitle() : docType);
            encData.put("clinicalNotes", summary);
            encData.put("assessmentPlan", "Clinical findings documented in " + (doc.getOriginalFilename() != null ? doc.getOriginalFilename() : "document"));
            encData.put("documentTitle", doc.getTitle());

            stagedFacts.add(DocumentExtractedFact.builder()
                    .documentId(doc.getId())
                    .patientId(doc.getPatientId())
                    .factType(FactType.ENCOUNTER)
                    .fieldName("Clinical Encounter (" + encounterType + ")")
                    .extractedDataJson(objectMapper.writeValueAsString(encData))
                    .status(FactStatus.PENDING)
                    .confidenceLevel(confidenceLevel)
                    .createdAt(OffsetDateTime.now())
                    .build());

            // 2. Candidate Diagnoses Facts
            JsonNode diagNode = root.has("diagnosesMentioned") ? root.get("diagnosesMentioned") : root.get("diagnoses");
            if (diagNode != null && diagNode.isArray()) {
                for (JsonNode d : diagNode) {
                    String desc = d.asText().trim();
                    if (!desc.isEmpty() && !desc.equalsIgnoreCase("not detected")) {
                        Map<String, Object> diagData = new LinkedHashMap<>();
                        diagData.put("description", desc);
                        diagData.put("code", detectIcdCode(desc));
                        diagData.put("severity", "MODERATE");

                        stagedFacts.add(DocumentExtractedFact.builder()
                                .documentId(doc.getId())
                                .patientId(doc.getPatientId())
                                .factType(FactType.DIAGNOSIS)
                                .fieldName(desc)
                                .extractedDataJson(objectMapper.writeValueAsString(diagData))
                                .status(FactStatus.PENDING)
                                .confidenceLevel(confidenceLevel)
                                .createdAt(OffsetDateTime.now())
                                .build());
                    }
                }
            }

            // 3. Candidate Medication Facts
            JsonNode medNode = root.get("medications");
            if (medNode != null && medNode.isArray()) {
                for (JsonNode m : medNode) {
                    Map<String, Object> medData = parseMedicationNode(m);
                    String medName = (String) medData.getOrDefault("medicationName", "Medication");
                    if (!medName.isEmpty() && !medName.equalsIgnoreCase("not detected")) {
                        stagedFacts.add(DocumentExtractedFact.builder()
                                .documentId(doc.getId())
                                .patientId(doc.getPatientId())
                                .factType(FactType.MEDICATION)
                                .fieldName(medName)
                                .extractedDataJson(objectMapper.writeValueAsString(medData))
                                .status(FactStatus.PENDING)
                                .confidenceLevel(confidenceLevel)
                                .createdAt(OffsetDateTime.now())
                                .build());
                    }
                }
            }

            // 4. Candidate Lab Result Facts
            JsonNode labNode = root.get("labResults");
            if (labNode != null && labNode.isArray()) {
                for (JsonNode lr : labNode) {
                    String testName = lr.path("testName").asText(lr.path("test").asText(lr.path("name").asText(""))).trim();
                    String value = lr.path("resultValue").asText(lr.path("value").asText(lr.path("result").asText(""))).trim();
                    if (!testName.isEmpty() && !value.isEmpty() && !value.equalsIgnoreCase("not detected")) {
                        Map<String, Object> labData = new LinkedHashMap<>();
                        labData.put("testName", testName);
                        labData.put("resultValue", value);
                        labData.put("unit", lr.path("unit").asText(lr.path("units").asText("")));
                        labData.put("referenceRange", lr.path("referenceRange").asText(lr.path("range").asText("")));
                        labData.put("flag", lr.path("flag").asText("NORMAL").toUpperCase());

                        stagedFacts.add(DocumentExtractedFact.builder()
                                .documentId(doc.getId())
                                .patientId(doc.getPatientId())
                                .factType(FactType.LAB_REPORT)
                                .fieldName(testName + " (" + value + " " + lr.path("unit").asText("") + ")")
                                .extractedDataJson(objectMapper.writeValueAsString(labData))
                                .status(FactStatus.PENDING)
                                .confidenceLevel(confidenceLevel)
                                .createdAt(OffsetDateTime.now())
                                .build());
                    }
                }
            }

            return factRepository.saveAll(stagedFacts);
        } catch (Exception e) {
            log.error("Failed to parse candidate facts for doc {}", doc.getId(), e);
            return List.of();
        }
    }

    /**
     * Lists candidate facts for a document with caller authorization evaluation.
     */
    public List<ExtractedFactResponse> getFactsForDocument(Long documentId, User caller) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        checkDocumentAccess(doc, caller);

        List<DocumentExtractedFact> facts = factRepository.findByDocumentIdOrderByCreatedAtAsc(documentId);
        if (facts.isEmpty()) {
            aiAnalysisRepository.findByDocumentId(documentId).ifPresent(analysis -> {
                createCandidateFactsFromAnalysis(doc, analysis);
            });
            facts = factRepository.findByDocumentIdOrderByCreatedAtAsc(documentId);
        }
        return facts.stream().map(this::toResponse).toList();
    }

    /**
     * Lists all pending candidate facts for a patient across all uploaded documents.
     */
    public List<ExtractedFactResponse> getPendingFactsForPatient(Long patientId, User caller) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (caller.getRole() == Role.PATIENT) {
            if (!securityEvaluator.isOwningPatient(auth, patientId)) {
                throw new AccessDeniedException("You can only review facts for your own patient profile.");
            }
        } else if (caller.getRole() == Role.DOCTOR) {
            if (!securityEvaluator.canAccessPatient(auth, patientId, "DOCUMENTS")) {
                throw new AccessDeniedException("Access denied: active DOCUMENTS consent required to view candidate facts.");
            }
        } else if (caller.getRole() == Role.NURSE) {
            if (!securityEvaluator.canAccessPatient(auth, patientId, "DOCUMENTS")) {
                throw new AccessDeniedException("Access denied: active care team delegation required.");
            }
        } else {
            throw new AccessDeniedException("Access denied for role: " + caller.getRole());
        }

        List<Document> patientDocs = documentRepository.findByPatientIdOrderByUploadedAtDesc(patientId);
        for (Document d : patientDocs) {
            if (!factRepository.existsByDocumentId(d.getId())) {
                aiAnalysisRepository.findByDocumentId(d.getId()).ifPresent(analysis -> {
                    createCandidateFactsFromAnalysis(d, analysis);
                });
            }
        }

        return factRepository.findByPatientIdAndStatusOrderByCreatedAtDesc(patientId, FactStatus.PENDING)
                .stream().map(this::toResponse).toList();
    }

    /**
     * Executes the explicit human confirmation workflow.
     * Maps confirmed/edited facts into canonical structured EHR entities with deduplication and provenance.
     */
    @Transactional
    public FactConfirmationSummary confirmFacts(Long documentId, ConfirmFactsBatchRequest request, User reviewer) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        checkDocumentAccess(doc, reviewer);

        Doctor doctor = null;
        if (reviewer.getRole() == Role.DOCTOR) {
            doctor = doctorRepository.findByUserId(reviewer.getId()).orElse(null);
        }

        int confirmedCount = 0;
        int editedCount = 0;
        int rejectedCount = 0;
        int duplicatesSkipped = 0;

        for (ConfirmFactDecision decision : request.decisions()) {
            DocumentExtractedFact fact = factRepository.findById(decision.factId())
                    .orElseThrow(() -> new IllegalArgumentException("Fact not found: " + decision.factId()));

            if (!fact.getDocumentId().equals(documentId)) {
                throw new IllegalArgumentException("Fact " + fact.getId() + " does not belong to document " + documentId);
            }

            String action = decision.action() != null ? decision.action().toUpperCase() : "CONFIRM";

            if ("REJECT".equals(action)) {
                fact.setStatus(FactStatus.REJECTED);
                fact.setRejectionReason(decision.rejectionReason() != null ? decision.rejectionReason().trim() : "Rejected during human review");
                fact.setReviewedByUserId(reviewer.getId());
                fact.setReviewedAt(OffsetDateTime.now());
                factRepository.save(fact);

                auditService.logAction(reviewer.getUsername(), reviewer.getRole().name(), "REJECT_CLINICAL_FACT",
                        "DocumentExtractedFact", fact.getId().toString(), "SUCCESS", "Rejected " + fact.getFactType() + " fact");
                rejectedCount++;
                continue;
            }

            // Action is CONFIRM or EDIT
            boolean isEdit = "EDIT".equals(action);
            fact.setStatus(isEdit ? FactStatus.EDITED : FactStatus.CONFIRMED);
            fact.setReviewedByUserId(reviewer.getId());
            fact.setReviewedAt(OffsetDateTime.now());

            Map<String, Object> data = resolveFactData(fact, decision);
            try {
                fact.setConfirmedDataJson(objectMapper.writeValueAsString(data));
            } catch (Exception ignored) {}

            String provenance = "Extracted from uploaded document: " + (doc.getOriginalFilename() != null ? doc.getOriginalFilename() : doc.getTitle()) + " (Document ID: " + documentId + ")";

            // Canonical mapping based on FactType
            switch (fact.getFactType()) {
                case ENCOUNTER -> {
                    // Check duplicate encounter for this document
                    boolean exists = encounterRepository.findByPatientIdOrderByEncounterDateDesc(doc.getPatientId()).stream()
                            .anyMatch(e -> documentId.equals(e.getSourceDocumentId()));

                    if (exists) {
                        duplicatesSkipped++;
                        Encounter existing = encounterRepository.findByPatientIdOrderByEncounterDateDesc(doc.getPatientId()).stream()
                                .filter(e -> documentId.equals(e.getSourceDocumentId())).findFirst().orElse(null);
                        if (existing != null) {
                            fact.setCanonicalEntityType("Encounter");
                            fact.setCanonicalEntityId(existing.getId());
                        }
                    } else {
                        String encType = String.valueOf(data.getOrDefault("encounterType", "OUTPATIENT"));
                        String complaint = String.valueOf(data.getOrDefault("chiefComplaint", doc.getTitle()));
                        String notes = String.valueOf(data.getOrDefault("clinicalNotes", "Confirmed from clinical document " + doc.getOriginalFilename()));
                        String plan = String.valueOf(data.getOrDefault("assessmentPlan", ""));

                        Encounter enc = Encounter.builder()
                                .patientId(doc.getPatientId())
                                .doctorId(doctor != null ? doctor.getId() : null)
                                .encounterType(encType)
                                .chiefComplaint(complaint)
                                .clinicalNotes(notes)
                                .assessmentPlan(plan)
                                .isAmended(false)
                                .isArchived(false)
                                .encounterDate(OffsetDateTime.now())
                                .sourceDocumentId(documentId)
                                .provenanceText(provenance)
                                .build();
                        enc = encounterRepository.save(enc);
                        fact.setCanonicalEntityType("Encounter");
                        fact.setCanonicalEntityId(enc.getId());

                        if (isEdit) editedCount++; else confirmedCount++;
                    }
                }

                case DIAGNOSIS -> {
                    String desc = String.valueOf(data.getOrDefault("description", fact.getFieldName())).trim();
                    String code = String.valueOf(data.getOrDefault("code", "ICD-10")).trim();
                    String severity = String.valueOf(data.getOrDefault("severity", "MODERATE")).trim().toUpperCase();

                    // Deduplication check: do not duplicate active diagnosis with same description
                    boolean exists = diagnosisRepository.findByPatientIdOrderByDiagnosedDateDesc(doc.getPatientId()).stream()
                            .anyMatch(d -> !d.isArchived() && "ACTIVE".equalsIgnoreCase(d.getStatus()) &&
                                    (d.getDescription().equalsIgnoreCase(desc) || (code.length() > 2 && code.equalsIgnoreCase(d.getCode()))));

                    if (exists) {
                        duplicatesSkipped++;
                        Diagnosis existing = diagnosisRepository.findByPatientIdOrderByDiagnosedDateDesc(doc.getPatientId()).stream()
                                .filter(d -> d.getDescription().equalsIgnoreCase(desc)).findFirst().orElse(null);
                        if (existing != null) {
                            fact.setCanonicalEntityType("Diagnosis");
                            fact.setCanonicalEntityId(existing.getId());
                        }
                    } else {
                        Diagnosis diag = Diagnosis.builder()
                                .patientId(doc.getPatientId())
                                .doctorId(doctor != null ? doctor.getId() : null)
                                .code(code)
                                .description(desc)
                                .severity(severity)
                                .status("ACTIVE")
                                .notes("Confirmed from document: " + doc.getOriginalFilename())
                                .diagnosedDate(OffsetDateTime.now())
                                .isArchived(false)
                                .sourceDocumentId(documentId)
                                .provenanceText(provenance)
                                .build();
                        diag = diagnosisRepository.save(diag);
                        fact.setCanonicalEntityType("Diagnosis");
                        fact.setCanonicalEntityId(diag.getId());

                        if (isEdit) editedCount++; else confirmedCount++;
                    }
                }

                case MEDICATION -> {
                    String medName = String.valueOf(data.getOrDefault("medicationName", fact.getFieldName())).trim();
                    String dosage = String.valueOf(data.getOrDefault("dosage", "As directed")).trim();
                    String freq = String.valueOf(data.getOrDefault("frequency", "DAILY")).trim();

                    // Deduplication check: do not duplicate active medication with same root name
                    String rootName = medName.split(" ")[0].toLowerCase();
                    boolean exists = prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(doc.getPatientId()).stream()
                            .filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus()))
                            .flatMap(p -> prescriptionItemRepository.findByPrescriptionId(p.getId()).stream())
                            .anyMatch(i -> i.isActive() && i.getMedicationName().toLowerCase().contains(rootName));

                    if (exists) {
                        duplicatesSkipped++;
                        fact.setCanonicalEntityType("PrescriptionItem");
                    } else {
                        Prescription pres = Prescription.builder()
                                .patientId(doc.getPatientId())
                                .doctorId(doctor != null ? doctor.getId() : null)
                                .status("ACTIVE")
                                .notes("Confirmed medication regimen from document: " + doc.getOriginalFilename())
                                .sourceDocumentId(documentId)
                                .provenanceText(provenance)
                                .createdAt(OffsetDateTime.now())
                                .build();
                        pres = prescriptionRepository.save(pres);

                        PrescriptionItem item = PrescriptionItem.builder()
                                .prescriptionId(pres.getId())
                                .medicationName(medName)
                                .dosage(dosage)
                                .frequency(freq)
                                .durationDays(30)
                                .startDate(LocalDate.now())
                                .active(true)
                                .build();
                        prescriptionItemRepository.save(item);

                        fact.setCanonicalEntityType("Prescription");
                        fact.setCanonicalEntityId(pres.getId());

                        if (isEdit) editedCount++; else confirmedCount++;
                    }
                }

                case LAB_REPORT -> {
                    String testName = String.valueOf(data.getOrDefault("testName", fact.getFieldName())).trim();
                    String resultValue = String.valueOf(data.getOrDefault("resultValue", "")).trim();
                    String unit = String.valueOf(data.getOrDefault("unit", "")).trim();
                    String flag = String.valueOf(data.getOrDefault("flag", "NORMAL")).trim().toUpperCase();
                    String refRange = String.valueOf(data.getOrDefault("referenceRange", "")).trim();

                    // Deduplication check: do not duplicate lab report from same document
                    boolean exists = labReportRepository.findByPatientIdOrderByReportedAtDesc(doc.getPatientId()).stream()
                            .anyMatch(lr -> lr.getTestName().equalsIgnoreCase(testName) && documentId.equals(lr.getDocumentId()));

                    if (exists) {
                        duplicatesSkipped++;
                        LabReport existing = labReportRepository.findByPatientIdOrderByReportedAtDesc(doc.getPatientId()).stream()
                                .filter(lr -> lr.getTestName().equalsIgnoreCase(testName) && documentId.equals(lr.getDocumentId()))
                                .findFirst().orElse(null);
                        if (existing != null) {
                            fact.setCanonicalEntityType("LabReport");
                            fact.setCanonicalEntityId(existing.getId());
                        }
                    } else {
                        LabReport report = LabReport.builder()
                                .patientId(doc.getPatientId())
                                .documentId(documentId)
                                .testName(testName)
                                .resultValue(resultValue)
                                .unit(unit)
                                .referenceRange(refRange)
                                .flag(flag)
                                .reportedAt(OffsetDateTime.now())
                                .provenanceText(provenance)
                                .build();
                        report = labReportRepository.save(report);
                        fact.setCanonicalEntityType("LabReport");
                        fact.setCanonicalEntityId(report.getId());

                        if (isEdit) editedCount++; else confirmedCount++;
                    }
                }

                default -> log.debug("FactType {} confirmation bypassed", fact.getFactType());
            }

            factRepository.save(fact);

            auditService.logAction(reviewer.getUsername(), reviewer.getRole().name(), "CONFIRM_CLINICAL_FACT",
                    "DocumentExtractedFact", fact.getId().toString(), "SUCCESS", "Confirmed " + fact.getFactType() + " fact for patient " + doc.getPatientId());
        }

        return new FactConfirmationSummary(
                request.decisions().size(),
                confirmedCount,
                editedCount,
                rejectedCount,
                duplicatesSkipped,
                String.format("Processed %d candidate facts: %d confirmed, %d edited, %d rejected, %d duplicate(s) skipped.",
                        request.decisions().size(), confirmedCount, editedCount, rejectedCount, duplicatesSkipped)
        );
    }

    private void checkDocumentAccess(Document doc, User caller) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (caller.getRole() == Role.PATIENT) {
            if (!securityEvaluator.isOwningPatient(auth, doc.getPatientId())) {
                throw new AccessDeniedException("You can only access documents in your own patient profile.");
            }
        } else if (caller.getRole() == Role.DOCTOR) {
            Doctor docProfile = doctorRepository.findByUserId(caller.getId()).orElse(null);
            boolean hasExplicitShare = docProfile != null && documentShareRepository.existsByDocumentIdAndDoctorId(doc.getId(), docProfile.getId());
            boolean hasConsent = securityEvaluator.canAccessPatient(auth, doc.getPatientId(), "DOCUMENTS");
            if (!hasExplicitShare && !hasConsent) {
                throw new AccessDeniedException("Access denied: active DOCUMENTS consent or explicit document share required.");
            }
        } else if (caller.getRole() == Role.NURSE) {
            if (!securityEvaluator.canAccessPatient(auth, doc.getPatientId(), "DOCUMENTS")) {
                throw new AccessDeniedException("Access denied: active care team delegation required.");
            }
        } else {
            throw new AccessDeniedException("Access denied for role: " + caller.getRole());
        }
    }

    private Map<String, Object> resolveFactData(DocumentExtractedFact fact, ConfirmFactDecision decision) {
        if (decision.editedData() != null && !decision.editedData().isEmpty()) {
            return decision.editedData();
        }
        try {
            return objectMapper.readValue(fact.getExtractedDataJson(), Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String determineEncounterType(DocumentCategory category, String docType) {
        String dt = (docType != null ? docType : "").toUpperCase();
        if (category == DocumentCategory.DISCHARGE_SUMMARY || dt.contains("DISCHARGE") || dt.contains("INPATIENT")) {
            return "INPATIENT";
        } else if (dt.contains("EMERGENCY")) {
            return "EMERGENCY";
        } else if (dt.contains("FOLLOW")) {
            return "FOLLOW_UP";
        }
        return "OUTPATIENT";
    }

    private String detectIcdCode(String desc) {
        String lower = desc.toLowerCase();
        if (lower.contains("type 2 diabetes") || lower.contains("diabetes mellitus")) return "E11.9";
        if (lower.contains("hypertension")) return "I10";
        if (lower.contains("hyperlipidemia") || lower.contains("cholesterol")) return "E78.5";
        if (lower.contains("asthma")) return "J45.909";
        if (lower.contains("coronary")) return "I25.10";
        return "ICD-10";
    }

    private Map<String, Object> parseMedicationNode(JsonNode m) {
        Map<String, Object> data = new LinkedHashMap<>();
        if (m.isTextual()) {
            String full = m.asText().trim();
            // Check for dosage pattern like '500 mg'
            var matcher = java.util.regex.Pattern.compile("(\\d+(?:\\.\\d+)?\\s*(?:mg|mcg|g|ml|units?))", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(full);
            String dosage = matcher.find() ? matcher.group(1) : "As directed";

            // Extract medication name before dosage
            String name = full;
            if (matcher.reset().find()) {
                name = full.substring(0, matcher.start()).trim();
            }
            if (name.isEmpty()) name = full;

            String freq = "DAILY";
            if (full.toLowerCase().contains("twice") || full.toLowerCase().contains("bid")) freq = "BID (Twice Daily)";
            else if (full.toLowerCase().contains("three") || full.toLowerCase().contains("tid")) freq = "TID (Three Times Daily)";
            else if (full.toLowerCase().contains("morning")) freq = "Once Daily (Morning)";

            data.put("medicationName", name);
            data.put("dosage", dosage);
            data.put("frequency", freq);
        } else {
            data.put("medicationName", m.path("name").asText(m.path("medicationName").asText("Medication")));
            data.put("dosage", m.path("dosage").asText("As directed"));
            data.put("frequency", m.path("frequency").asText("DAILY"));
        }
        return data;
    }

    private ExtractedFactResponse toResponse(DocumentExtractedFact f) {
        Map<String, Object> extracted = Map.of();
        Map<String, Object> confirmed = null;
        try {
            if (f.getExtractedDataJson() != null) extracted = objectMapper.readValue(f.getExtractedDataJson(), Map.class);
            if (f.getConfirmedDataJson() != null) confirmed = objectMapper.readValue(f.getConfirmedDataJson(), Map.class);
        } catch (Exception ignored) {}

        String reviewerName = null;
        if (f.getReviewedByUserId() != null) {
            reviewerName = userRepository.findById(f.getReviewedByUserId())
                    .map(User::getFullName).orElse("User #" + f.getReviewedByUserId());
        }

        String provenance = "Extracted from uploaded document (Document ID: " + f.getDocumentId() + ")";

        return new ExtractedFactResponse(
                f.getId(),
                f.getDocumentId(),
                f.getPatientId(),
                f.getFactType(),
                f.getFieldName(),
                extracted,
                confirmed,
                f.getStatus(),
                f.getConfidenceLevel(),
                f.getCanonicalEntityType(),
                f.getCanonicalEntityId(),
                f.getReviewedByUserId(),
                reviewerName,
                f.getReviewedAt(),
                f.getRejectionReason(),
                provenance,
                f.getCreatedAt()
        );
    }
}
