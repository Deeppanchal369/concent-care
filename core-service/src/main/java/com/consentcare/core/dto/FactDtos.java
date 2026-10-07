package com.consentcare.core.dto;

import com.consentcare.core.model.FactStatus;
import com.consentcare.core.model.FactType;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public class FactDtos {

    public record ExtractedFactResponse(
            Long id,
            Long documentId,
            Long patientId,
            FactType factType,
            String fieldName,
            Map<String, Object> extractedData,
            Map<String, Object> confirmedData,
            FactStatus status,
            String confidenceLevel,
            String canonicalEntityType,
            Long canonicalEntityId,
            Long reviewedByUserId,
            String reviewedByUserName,
            OffsetDateTime reviewedAt,
            String rejectionReason,
            String provenanceText,
            OffsetDateTime createdAt
    ) {}

    public record ConfirmFactDecision(
            Long factId,
            String action, // CONFIRM, EDIT, REJECT
            Map<String, Object> editedData,
            String rejectionReason
    ) {}

    public record ConfirmFactsBatchRequest(
            List<ConfirmFactDecision> decisions
    ) {}

    public record FactConfirmationSummary(
            int totalProcessed,
            int confirmedCount,
            int editedCount,
            int rejectedCount,
            int duplicatesSkipped,
            String message
    ) {}
}

