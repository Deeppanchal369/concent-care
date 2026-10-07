package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "model_registry")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_key", nullable = false, unique = true, length = 100)
    private String modelKey;

    @Column(name = "model_name", nullable = false, length = 150)
    private String modelName;

    @Column(nullable = false, length = 50)
    private String version;

    @Column(nullable = false, length = 100)
    private String algorithm;

    @Column(name = "dataset_name", nullable = false, length = 150)
    private String datasetName;

    @Column(name = "target_name", nullable = false, length = 100)
    private String targetName;

    @Column(name = "prediction_horizon", nullable = false, length = 50)
    private String predictionHorizon;

    @Column(name = "features_json", columnDefinition = "TEXT", nullable = false)
    private String featuresJson;

    @Column(name = "metrics_json", columnDefinition = "TEXT")
    private String metricsJson;

    @Column(name = "feature_importances_json", columnDefinition = "TEXT")
    private String featureImportancesJson;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String limitations;

    @Column(nullable = false, length = 30)
    private String status; // TRAINED, PENDING_DATA, UNSUPPORTED

    @Column(name = "trained_at")
    private OffsetDateTime trainedAt;
}

