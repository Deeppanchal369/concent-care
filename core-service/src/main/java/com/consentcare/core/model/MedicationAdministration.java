package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "medication_administrations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationAdministration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prescription_item_id", nullable = false)
    private Long prescriptionItemId;

    @Column(name = "nurse_id", nullable = false)
    private Long nurseId;

    @Column(name = "administered_at", nullable = false)
    private OffsetDateTime administeredAt;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "GIVEN"; // GIVEN, REFUSED, HELD

    @Column(columnDefinition = "TEXT")
    private String notes;
}

