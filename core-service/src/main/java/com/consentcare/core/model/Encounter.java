package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "encounters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Encounter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "encounter_type", nullable = false, length = 50)
    private String encounterType;

    @Column(name = "chief_complaint", columnDefinition = "TEXT")
    private String chiefComplaint;

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    @Column(name = "assessment_plan", columnDefinition = "TEXT")
    private String assessmentPlan;

    @Column(name = "is_amended", nullable = false)
    @Builder.Default
    private boolean isAmended = false;

    @Column(name = "amendment_notes", columnDefinition = "TEXT")
    private String amendmentNotes;

    @Column(name = "amended_at")
    private OffsetDateTime amendedAt;

    @Column(name = "amended_by")
    private Long amendedBy;

    @Column(name = "is_archived", nullable = false)
    @Builder.Default
    private boolean isArchived = false;

    @Column(name = "encounter_date", nullable = false)
    private OffsetDateTime encounterDate;
}
