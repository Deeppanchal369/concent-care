package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "dataset_registry")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatasetRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dataset_name", nullable = false, unique = true, length = 150)
    private String datasetName;

    @Column(name = "dataset_type", nullable = false, length = 50)
    private String datasetType; // REAL_DEIDENTIFIED_EHR, HISTORICAL_CLINICAL_COHORT, EXTERNAL_BENCHMARK

    @Column(nullable = false, length = 100)
    private String geography;

    @Column(name = "clinical_period", nullable = false, length = 50)
    private String clinicalPeriod;

    @Column(name = "patient_count", nullable = false)
    private Long patientCount;

    @Column(name = "record_count", nullable = false)
    private Long recordCount;

    @Column(name = "access_status", nullable = false, length = 40)
    private String accessStatus; // AVAILABLE, REQUIRES_CREDENTIALED_DATA, NOT_AVAILABLE

    @Column(name = "training_status", nullable = false, length = 30)
    private String trainingStatus; // TRAINED, NOT_TRAINED

    @Column(name = "validation_status", nullable = false, length = 50)
    private String validationStatus;

    @Column(name = "model_version", nullable = false, length = 50)
    private String modelVersion;

    @Column(name = "metrics_json", columnDefinition = "TEXT")
    private String metricsJson;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String limitations;

    @Column(name = "source_citation", columnDefinition = "TEXT", nullable = false)
    private String sourceCitation;

    @Column(name = "is_primary_research", nullable = false)
    @Builder.Default
    private boolean isPrimaryResearch = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}

