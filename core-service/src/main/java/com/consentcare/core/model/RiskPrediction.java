package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "risk_predictions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskPrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "requested_by_doctor_id")
    private Long requestedByDoctorId;

    @Column(name = "model_version", nullable = false, length = 50)
    private String modelVersion;

    @Column(name = "risk_score", precision = 5, scale = 4)
    private BigDecimal riskScore;

    @Column(name = "risk_level", length = 20)
    private String riskLevel; // LOW, MODERATE, HIGH, INSUFFICIENT_DATA

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "COMPLETED";

    @Column(name = "data_completeness", length = 50)
    @Builder.Default
    private String dataCompleteness = "COMPLETE";

    @Column(name = "contributing_factors_json", columnDefinition = "TEXT")
    private String contributingFactorsJson;

    @Column(name = "features_used_json", columnDefinition = "TEXT")
    private String featuresUsedJson;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "clinical_disclaimer", nullable = false, length = 255)
    @Builder.Default
    private String clinicalDisclaimer = "Decision-support only. This prediction is not a medical diagnosis.";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
