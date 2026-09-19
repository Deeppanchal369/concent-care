package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "lab_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lab_request_id")
    private Long labRequestId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "test_name", nullable = false, length = 150)
    private String testName;

    @Column(name = "result_value", nullable = false, length = 100)
    private String resultValue;

    @Column(length = 50)
    private String unit;

    @Column(name = "reference_range", length = 100)
    private String referenceRange;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String flag = "NORMAL"; // NORMAL, HIGH, LOW, CRITICAL, ABNORMAL

    @Column(name = "reported_at", nullable = false)
    private OffsetDateTime reportedAt;
}

