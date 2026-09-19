package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "observations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Observation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "nurse_id")
    private Long nurseId;

    @Column(name = "doctor_id")
    private Long doctorId;

    @Column(name = "vital_type", nullable = false, length = 50)
    private String vitalType;

    @Column(name = "value_numeric", nullable = false, precision = 8, scale = 2)
    private BigDecimal valueNumeric;

    @Column(name = "value_text", length = 100)
    private String valueText;

    @Column(nullable = false, length = 30)
    private String unit;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "observed_at", nullable = false)
    private OffsetDateTime observedAt;
}

