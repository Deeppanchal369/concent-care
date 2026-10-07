package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "clinical_intelligence_runs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClinicalIntelligenceRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "requested_by_user_id", nullable = false)
    private Long requestedByUserId;

    @Column(name = "generated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime generatedAt = OffsetDateTime.now();

    @Column(name = "data_coverage_json", columnDefinition = "TEXT", nullable = false)
    private String dataCoverageJson;

    @Column(name = "historical_summary_json", columnDefinition = "TEXT", nullable = false)
    private String historicalSummaryJson;

    @Column(name = "current_status_json", columnDefinition = "TEXT", nullable = false)
    private String currentStatusJson;

    @Column(name = "trends_json", columnDefinition = "TEXT", nullable = false)
    private String trendsJson;

    @Column(name = "risk_signals_json", columnDefinition = "TEXT", nullable = false)
    private String riskSignalsJson;

    @Column(name = "symptoms_to_monitor_json", columnDefinition = "TEXT", nullable = false)
    private String symptomsToMonitorJson;

    @Column(name = "missing_data_json", columnDefinition = "TEXT")
    private String missingDataJson;

    @Column(name = "limitations_json", columnDefinition = "TEXT", nullable = false)
    private String limitationsJson;

    @Column(name = "model_version", nullable = false, length = 50)
    private String modelVersion;

    @Column(name = "requires_clinical_review", nullable = false)
    @Builder.Default
    private boolean requiresClinicalReview = true;
}

