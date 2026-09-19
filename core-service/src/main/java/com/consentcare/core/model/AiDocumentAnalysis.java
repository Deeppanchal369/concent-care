package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "ai_document_analyses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiDocumentAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "report_type", length = 100)
    private String reportType;

    @Column(name = "summary_text", columnDefinition = "TEXT", nullable = false)
    private String summaryText;

    @Column(name = "entities_json", columnDefinition = "TEXT", nullable = false)
    private String entitiesJson;

    @Column(name = "confidence_score", precision = 5, scale = 4)
    private BigDecimal confidenceScore;

    @Column(nullable = false, length = 255)
    @Builder.Default
    private String disclaimer = "AI-assisted — verify against original document.";

    @Column(name = "model_provider", length = 100)
    private String modelProvider;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @Column(name = "prompt_version", length = 50)
    private String promptVersion;

    @Column(name = "status", length = 30)
    @Builder.Default
    private String status = "READY";

    @Column(name = "processing_duration_ms")
    private Long processingDurationMs;

    @Column(name = "structured_result_json", columnDefinition = "TEXT")
    private String structuredResultJson;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
