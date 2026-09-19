package com.consentcare.core.service;

import com.consentcare.core.dto.DocumentDtos.*;
import com.consentcare.core.dto.PageResponse;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import com.consentcare.core.security.ConsentSecurityEvaluator;
import com.consentcare.core.security.DocumentSecurityValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentShareRepository documentShareRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AiDocumentAnalysisRepository aiAnalysisRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final ConsentSecurityEvaluator securityEvaluator;
    private final DocumentSecurityValidator documentSecurityValidator;
    private final WebClient agentServiceClient;

    @Value("${consentcare.storage.upload-dir}")
    private String uploadDir;

    @Transactional
    public DocumentResponse upload(Long patientId, User uploader, MultipartFile file, DocumentCategory category, String title, String description) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (uploader.getRole() == Role.PATIENT) {
            if (!securityEvaluator.isOwningPatient(auth, patientId)) {
                throw new AccessDeniedException("You can only upload documents to your own patient profile.");
            }
        } else if (uploader.getRole() == Role.DOCTOR || uploader.getRole() == Role.NURSE) {
            if (!securityEvaluator.canAccessPatientAny(auth, patientId)) {
                throw new AccessDeniedException("You cannot upload documents for a patient without active consent or care assignment.");
            }
        } else {
            throw new AccessDeniedException("Administrators do not perform clinical document uploads.");
        }

        documentSecurityValidator.validateUpload(file);
        String safeOriginalName = documentSecurityValidator.sanitizeFilename(file.getOriginalFilename());
        String extension = documentSecurityValidator.extractExtension(safeOriginalName);

        try {
            Path patientDir = Paths.get(uploadDir, String.valueOf(patientId));
            Files.createDirectories(patientDir);

            String storedName = UUID.randomUUID() + "_" + safeOriginalName;
            Path target = patientDir.resolve(storedName);
            file.transferTo(target);

            byte[] fileBytes = Files.readAllBytes(target);
            String extractedText = "";
            if (extension.equals("txt") || extension.equals("csv")) {
                try {
                    extractedText = new String(fileBytes, StandardCharsets.UTF_8);
                } catch (Exception ignored) {}
            }

            String docTitle = (title != null && !title.isBlank()) ? title.trim() : safeOriginalName;

            Document doc = Document.builder()
                    .patientId(patientId)
                    .uploadedBy(uploader.getId())
                    .title(docTitle)
                    .originalFilename(safeOriginalName)
                    .fileName(safeOriginalName)
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .storagePath(target.toString())
                    .category(category != null ? category : DocumentCategory.OTHER)
                    .description(description != null ? description.trim() : null)
                    .processingStatus(ProcessingStatus.READY)
                    .aiStatus(ProcessingStatus.PROCESSING)
                    .extractedText(extractedText)
                    .isArchived(false)
                    .uploadedAt(OffsetDateTime.now())
                    .build();
            doc = documentRepository.save(doc);

            processDocumentWithAi(doc, fileBytes, safeOriginalName);

            auditService.logAction(uploader.getUsername(), uploader.getRole().name(), "UPLOAD_DOCUMENT", "Document", doc.getId().toString(), "SUCCESS", "Uploaded document: " + docTitle);
            auditService.logAccess(patientId, uploader, "DOCUMENTS", "ALLOW", "Uploaded document: " + docTitle, false);

            return toResponse(doc);
        } catch (IOException e) {
            log.error("Failed to store uploaded file", e);
            throw new RuntimeException("Failed to store uploaded file: " + e.getMessage(), e);
        }
    }

    private void processDocumentWithAi(Document doc, byte[] fileBytes, String fileName) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new ByteArrayResource(fileBytes)).filename(fileName);
            builder.part("document_id", doc.getId().toString());
            builder.part("patient_id", doc.getPatientId().toString());
            builder.part("category", doc.getCategory().name());
            builder.part("file_name", fileName);

            agentServiceClient.post()
                    .uri("/agent/process-file")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(java.time.Duration.ofSeconds(45))
                    .subscribe(
                            result -> saveAiAnalysisFromAgent(doc, result),
                            error -> {
                                log.warn("Agent-service unavailable for doc {}, running resilient clinical fallback: {}", doc.getId(), error.getMessage());
                                runFallbackClinicalAnalysis(doc, fileName);
                            }
                    );
        } catch (Exception e) {
            log.error("Failed to dispatch document to agent-service", e);
            runFallbackClinicalAnalysis(doc, fileName);
        }
    }

    private static final java.util.Set<String> BANNED_PLACEHOLDERS = java.util.Set.of(
            "string", "number", "object", "example", "test", "unknown", "null", "undefined", "n/a", "none", ""
    );

    private boolean isPlaceholder(String val) {
        if (val == null) return true;
        String s = val.trim().toLowerCase();
        return s.isEmpty() || BANNED_PLACEHOLDERS.contains(s) || s.startsWith("string");
    }

    private void saveAiAnalysisFromAgent(Document doc, Map result) {
        try {
            String summary = (String) result.getOrDefault("summary", "");
            if (isPlaceholder(summary) || summary.length() < 8) {
                log.warn("Invalid or placeholder summary received for doc {}, running fallback", doc.getId());
                runFallbackClinicalAnalysis(doc, doc.getFileName());
                return;
            }

            String reportType = (String) result.getOrDefault("report_type", "");
            if (isPlaceholder(reportType)) {
                reportType = doc.getCategory().name().replace("_", " ").toLowerCase();
            }

            String structuredJson = (String) result.getOrDefault("structured_json", "{}");
            try {
                com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(structuredJson);
                if (!node.isObject()) {
                    throw new IllegalArgumentException("Structured JSON is not an object");
                }
            } catch (Exception e) {
                log.warn("Malformed structured JSON received for doc {}, running fallback", doc.getId());
                runFallbackClinicalAnalysis(doc, doc.getFileName());
                return;
            }

            String extractedText = (String) result.getOrDefault("extracted_text", "");
            String modelProvider = (String) result.getOrDefault("model_provider", "local-nlp");
            String status = (String) result.getOrDefault("extraction_status", "READY");

            AiDocumentAnalysis analysis = AiDocumentAnalysis.builder()
                    .documentId(doc.getId())
                    .patientId(doc.getPatientId())
                    .reportType(reportType)
                    .summaryText(summary)
                    .entitiesJson(structuredJson)
                    .confidenceScore(null)
                    .disclaimer("AI-assisted — verify against original document.")
                    .modelProvider(modelProvider)
                    .modelVersion("1.0.0")
                    .promptVersion("1.0.0")
                    .status(status)
                    .structuredResultJson(structuredJson)
                    .createdAt(OffsetDateTime.now())
                    .build();
            aiAnalysisRepository.save(analysis);

            doc.setExtractedText(extractedText);
            doc.setAiStatus(ProcessingStatus.READY);
            documentRepository.save(doc);

            auditService.logAction("SYSTEM", "AI_AGENT", "DOCUMENT_AI_ANALYSIS", "Document", doc.getId().toString(), "SUCCESS", "Completed grounded AI document extraction via " + modelProvider);

            patientRepository.findById(doc.getPatientId()).ifPresent(p -> {
                if (p.getLinkedUserId() != null) {
                    notificationService.createNotification(
                            p.getLinkedUserId(),
                            "AI_PROCESSING_FINISHED",
                            "Report Analysis Complete",
                            "AI processing for " + (doc.getTitle() != null ? doc.getTitle() : doc.getFileName()) + " has completed successfully.",
                            "Document",
                            doc.getId().toString()
                    );
                }
            });
        } catch (Exception e) {
            log.error("Failed to parse agent response for doc {}", doc.getId(), e);
            runFallbackClinicalAnalysis(doc, doc.getFileName());
        }
    }

    private void runFallbackClinicalAnalysis(Document doc, String fileName) {
        try {
            String reportType = doc.getCategory().name().replace("_", " ");
            String summary = "AI analysis is temporarily unavailable. You can still view the original report.";
            String entities = "{\"documentType\":\"" + reportType + "\",\"summary\":\"" + summary + "\",\"labResults\":[],\"medications\":[],\"diagnosesMentioned\":[],\"symptomsMentioned\":\"Not detected\",\"uncertainItems\":[\"AI processing temporarily unavailable\"]}";

            AiDocumentAnalysis analysis = AiDocumentAnalysis.builder()
                    .documentId(doc.getId())
                    .patientId(doc.getPatientId())
                    .reportType(reportType)
                    .summaryText(summary)
                    .entitiesJson(entities)
                    .confidenceScore(null)
                    .disclaimer("AI-assisted — verify against original document.")
                    .modelProvider("unavailable")
                    .modelVersion("1.0.0")
                    .promptVersion("1.0.0")
                    .status("NEEDS_REVIEW")
                    .structuredResultJson(entities)
                    .createdAt(OffsetDateTime.now())
                    .build();
            aiAnalysisRepository.save(analysis);

            doc.setAiStatus(ProcessingStatus.NEEDS_REVIEW);
            documentRepository.save(doc);
        } catch (Exception e) {
            log.error("Failed to execute fallback analysis", e);
        }
    }

    public PageResponse<DocumentResponse> listPagedForPatient(
            Long patientId,
            DocumentCategory category,
            String query,
            Pageable pageable,
            User actor
    ) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_DOCUMENTS_PAGED", "Patient", patientId.toString(), "SUCCESS", "Listed paginated patient documents");
        Page<Document> page = documentRepository.searchDocuments(patientId, category, query, pageable);
        List<DocumentResponse> responses = page.getContent().stream().map(this::toResponse).toList();
        return PageResponse.from(page, responses);
    }

    public List<DocumentResponse> listForPatient(Long patientId, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_DOCUMENTS", "Patient", patientId.toString(), "SUCCESS", "Listed patient documents");
        return documentRepository.findByPatientIdOrderByUploadedAtDesc(patientId).stream()
                .filter(d -> !d.isArchived())
                .map(this::toResponse)
                .toList();
    }

    public DocumentDetailResponse getDocumentDetail(Long documentId, User actor) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        validateDocumentAccess(doc, actor);

        AiDocumentAnalysis analysis = aiAnalysisRepository.findByDocumentId(documentId).orElse(null);
        AiDocumentAnalysisDto analysisDto = null;
        if (analysis != null) {
            analysisDto = new AiDocumentAnalysisDto(
                    analysis.getId(),
                    analysis.getDocumentId(),
                    analysis.getReportType(),
                    analysis.getSummaryText(),
                    analysis.getEntitiesJson(),
                    analysis.getConfidenceScore(),
                    analysis.getDisclaimer(),
                    analysis.getModelProvider(),
                    analysis.getModelVersion(),
                    analysis.getStatus(),
                    analysis.getStructuredResultJson(),
                    analysis.getCreatedAt()
            );
        }

        List<DocumentShare> shares = documentShareRepository.findByDocumentId(documentId);
        List<Long> doctorIds = shares.stream().map(s -> s.getDoctor().getId()).toList();
        List<String> doctorNames = shares.stream().map(s -> s.getDoctor().getUser().getFullName()).toList();
        String sharingStatus = shares.isEmpty() ? "PRIVATE" : "SHARED";

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "VIEW_DOCUMENT_DETAIL", "Document", documentId.toString(), "SUCCESS", "Viewed document metadata & AI extraction");

        return new DocumentDetailResponse(
                doc.getId(),
                doc.getId(),
                doc.getPatientId(),
                doc.getTitle() != null ? doc.getTitle() : doc.getFileName(),
                doc.getOriginalFilename() != null ? doc.getOriginalFilename() : doc.getFileName(),
                doc.getFileName(),
                doc.getContentType(),
                doc.getContentType(),
                doc.getFileSize(),
                doc.getFileSize(),
                doc.getCategory(),
                doc.getDescription(),
                doc.getProcessingStatus(),
                doc.getAiStatus(),
                doc.getExtractedText(),
                analysisDto,
                doc.getUploadedAt(),
                doc.getUploadedBy(),
                resolveUploaderName(doc.getUploadedBy()),
                sharingStatus,
                doctorIds,
                doctorNames,
                doc.isArchived()
        );
    }

    @Transactional
    public DocumentResponse updateDocument(Long documentId, UpdateDocumentRequest req, User actor) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        validateDocumentModify(doc, actor);

        if (req.title() != null && !req.title().isBlank()) {
            doc.setTitle(req.title().trim());
        }
        if (req.category() != null) {
            doc.setCategory(req.category());
        }
        if (req.description() != null) {
            doc.setDescription(req.description().trim());
        }

        doc = documentRepository.save(doc);
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "UPDATE_DOCUMENT", "Document", documentId.toString(), "SUCCESS", "Updated document metadata");
        return toResponse(doc);
    }

    @Transactional
    public void archiveDocument(Long documentId, User actor) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        validateDocumentModify(doc, actor);

        doc.setArchived(true);
        doc.setArchivedAt(OffsetDateTime.now());
        doc.setArchivedBy(actor.getId());
        documentRepository.save(doc);

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "ARCHIVE_DOCUMENT", "Document", documentId.toString(), "SUCCESS", "Archived document " + doc.getId());
        auditService.logAccess(doc.getPatientId(), actor, "DOCUMENTS", "ALLOW", "Archived document: " + (doc.getTitle() != null ? doc.getTitle() : doc.getFileName()), false);
    }

    @Transactional
    public DocumentResponse shareDocument(Long documentId, Long doctorId, User actor) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        validateDocumentModify(doc, actor);

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found: " + doctorId));

        if (!documentShareRepository.existsByDocumentIdAndDoctorId(documentId, doctorId)) {
            DocumentShare share = DocumentShare.builder()
                    .document(doc)
                    .doctor(doctor)
                    .sharedAt(OffsetDateTime.now())
                    .build();
            documentShareRepository.save(share);

            if (doctor.getUser() != null) {
                notificationService.createNotification(
                        doctor.getUser().getId(),
                        "NEW_REPORT",
                        "New Clinical Document Shared",
                        "Patient has shared clinical document: " + (doc.getTitle() != null ? doc.getTitle() : doc.getFileName()),
                        "Document",
                        doc.getId().toString()
                );
            }

            auditService.logAction(actor.getUsername(), actor.getRole().name(), "SHARE_DOCUMENT", "Document", documentId.toString(), "SUCCESS", "Shared document with Dr. " + doctor.getUser().getFullName());
            auditService.logAccess(doc.getPatientId(), actor, "DOCUMENTS", "ALLOW", "Shared document with Dr. " + doctor.getUser().getFullName(), false);
        }

        return toResponse(doc);
    }

    @Transactional
    public DocumentResponse revokeDocumentShare(Long documentId, Long doctorId, User actor) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        validateDocumentModify(doc, actor);

        documentShareRepository.deleteByDocumentIdAndDoctorId(documentId, doctorId);
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "REVOKE_DOCUMENT_SHARE", "Document", documentId.toString(), "SUCCESS", "Revoked share for doctor " + doctorId);
        auditService.logAccess(doc.getPatientId(), actor, "DOCUMENTS", "ALLOW", "Revoked document share for doctor #" + doctorId, false);

        return toResponse(doc);
    }

    public Document getMetaForDownload(Long documentId, User actor) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        validateDocumentAccess(doc, actor);

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "DOWNLOAD_DOCUMENT", "Document", documentId.toString(), "SUCCESS", "Downloaded file: " + doc.getFileName());
        auditService.logAccess(doc.getPatientId(), actor, "DOCUMENTS", "ALLOW", "Accessed document: " + (doc.getTitle() != null ? doc.getTitle() : doc.getFileName()), false);
        return doc;
    }

    public Resource loadAsResource(Document doc) {
        Path path = Paths.get(doc.getStoragePath());
        if (!Files.exists(path)) {
            throw new IllegalArgumentException("Stored file is missing on disk: " + doc.getStoragePath());
        }
        return new FileSystemResource(path);
    }

    private void validateDocumentAccess(Document doc, User actor) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (actor.getRole() == Role.ADMIN) {
            throw new AccessDeniedException("Administrators do not have direct access to clinical documents.");
        }
        if (actor.getRole() == Role.PATIENT) {
            if (!securityEvaluator.isOwningPatient(auth, doc.getPatientId())) {
                throw new AccessDeniedException("Access denied to document from another patient profile.");
            }
            return;
        }
        if (actor.getRole() == Role.DOCTOR) {
            Doctor docProfile = doctorRepository.findByUserId(actor.getId()).orElse(null);
            boolean hasExplicitShare = docProfile != null && documentShareRepository.existsByDocumentIdAndDoctorId(doc.getId(), docProfile.getId());
            boolean hasConsent = securityEvaluator.canAccessPatient(auth, doc.getPatientId(), "DOCUMENTS");
            if (!hasExplicitShare && !hasConsent) {
                throw new AccessDeniedException("Access denied: no active consent or document share exists for Dr. " + actor.getFullName());
            }
            return;
        }
        if (actor.getRole() == Role.NURSE) {
            if (!securityEvaluator.canAccessPatient(auth, doc.getPatientId(), "DOCUMENTS")) {
                throw new AccessDeniedException("Access denied: no active care team delegation exists for this patient record.");
            }
            return;
        }
        throw new AccessDeniedException("Unauthorized access attempt.");
    }

    private void validateDocumentModify(Document doc, User actor) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (actor.getRole() == Role.PATIENT) {
            if (!securityEvaluator.isOwningPatient(auth, doc.getPatientId())) {
                throw new AccessDeniedException("You can only modify documents in your own patient chart.");
            }
            return;
        }
        if (actor.getRole() == Role.DOCTOR) {
            if (!securityEvaluator.canAccessPatient(auth, doc.getPatientId(), "DOCUMENTS")) {
                throw new AccessDeniedException("You require active consent to modify documents in this chart.");
            }
            return;
        }
        throw new AccessDeniedException("Unauthorized modification attempt.");
    }

    private String resolveUploaderName(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getFullName() + " (" + u.getRole() + ")")
                .orElse("System");
    }

    public DocumentResponse toResponse(Document d) {
        List<DocumentShare> shares = documentShareRepository.findByDocumentId(d.getId());
        List<Long> doctorIds = shares.stream().map(s -> s.getDoctor().getId()).toList();
        List<String> doctorNames = shares.stream().map(s -> s.getDoctor().getUser().getFullName()).toList();
        String sharingStatus = shares.isEmpty() ? "PRIVATE" : "SHARED";

        return new DocumentResponse(
                d.getId(),
                d.getId(),
                d.getPatientId(),
                d.getTitle() != null ? d.getTitle() : d.getFileName(),
                d.getOriginalFilename() != null ? d.getOriginalFilename() : d.getFileName(),
                d.getFileName(),
                d.getContentType(),
                d.getContentType(),
                d.getFileSize(),
                d.getFileSize(),
                d.getCategory(),
                d.getDescription(),
                d.getProcessingStatus(),
                d.getAiStatus(),
                d.getUploadedAt(),
                d.getUploadedBy(),
                resolveUploaderName(d.getUploadedBy()),
                sharingStatus,
                doctorIds,
                doctorNames,
                d.isArchived()
        );
    }
}
