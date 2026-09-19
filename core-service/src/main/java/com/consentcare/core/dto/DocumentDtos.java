package com.consentcare.core.dto;

import com.consentcare.core.model.DocumentCategory;
import com.consentcare.core.model.ProcessingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public class DocumentDtos {

    public record DocumentResponse(
            Long id,
            Long documentId,
            Long patientId,
            String title,
            String originalFilename,
            String fileName,
            String contentType,
            String mimeType,
            long fileSize,
            long size,
            DocumentCategory category,
            String description,
            ProcessingStatus processingStatus,
            ProcessingStatus aiStatus,
            OffsetDateTime uploadedAt,
            Long uploadedBy,
            String uploadedByName,
            String sharingStatus,
            List<Long> sharedWithDoctorIds,
            List<String> sharedWithDoctorNames,
            boolean isArchived
    ) {}

    public record DocumentDetailResponse(
            Long id,
            Long documentId,
            Long patientId,
            String title,
            String originalFilename,
            String fileName,
            String contentType,
            String mimeType,
            long fileSize,
            long size,
            DocumentCategory category,
            String description,
            ProcessingStatus processingStatus,
            ProcessingStatus aiStatus,
            String extractedText,
            AiDocumentAnalysisDto aiAnalysis,
            OffsetDateTime uploadedAt,
            Long uploadedBy,
            String uploadedByName,
            String sharingStatus,
            List<Long> sharedWithDoctorIds,
            List<String> sharedWithDoctorNames,
            boolean isArchived
    ) {}

    public record UpdateDocumentRequest(
            @Size(max = 255) String title,
            DocumentCategory category,
            @Size(max = 255) String description
    ) {}

    public record ShareDocumentRequest(
            Long doctorId
    ) {}

    public record AiDocumentAnalysisDto(
            Long id,
            Long documentId,
            String reportType,
            String summaryText,
            String entitiesJson,
            BigDecimal confidenceScore,
            String disclaimer,
            String modelProvider,
            String modelVersion,
            String status,
            String structuredResultJson,
            OffsetDateTime createdAt
    ) {}

    public record RiskAssessmentResponse(
            Long id,
            Long patientId,
            String modelVersion,
            BigDecimal riskScore,
            String riskLevel,
            Map<String, Object> contributingFactors,
            Map<String, Object> featuresUsed,
            String clinicalDisclaimer,
            OffsetDateTime createdAt
    ) {}
}
