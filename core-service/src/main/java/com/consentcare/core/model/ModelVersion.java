package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "model_versions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(nullable = false, unique = true, length = 50)
    private String version;

    @Column(nullable = false, length = 100)
    private String algorithm;

    @Column(name = "dataset_name", nullable = false, length = 150)
    private String datasetName;

    @Column(name = "metrics_json", columnDefinition = "TEXT", nullable = false)
    private String metricsJson;

    @Column(name = "trained_at", nullable = false)
    private OffsetDateTime trainedAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}

