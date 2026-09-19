package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "lab_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LabRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "test_name", nullable = false, length = 150)
    private String testName;

    @Column(length = 100)
    private String category;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String urgency = "ROUTINE";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ORDERED"; // ORDERED, SAMPLE_COLLECTED, IN_PROGRESS, COMPLETED, CANCELLED

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}

