package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "document_extracted_facts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentExtractedFact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "fact_type", nullable = false, length = 50)
    private FactType factType;

    @Column(name = "field_name", length = 150)
    private String fieldName;

    @Column(name = "extracted_data_json", columnDefinition = "TEXT", nullable = false)
    private String extractedDataJson;

    @Column(name = "confirmed_data_json", columnDefinition = "TEXT")
    private String confirmedDataJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private FactStatus status = FactStatus.PENDING;

    @Column(name = "confidence_level", nullable = false, length = 30)
    @Builder.Default
    private String confidenceLevel = "STANDARD"; // STANDARD, NEEDS_REVIEW, LOW_CONFIDENCE

    @Column(name = "canonical_entity_type", length = 50)
    private String canonicalEntityType; // Encounter, Diagnosis, Prescription, LabReport

    @Column(name = "canonical_entity_id")
    private Long canonicalEntityId;

    @Column(name = "reviewed_by_user_id")
    private Long reviewedByUserId;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}

