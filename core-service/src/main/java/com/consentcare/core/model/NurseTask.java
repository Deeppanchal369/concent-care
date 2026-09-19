package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "nurse_tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NurseTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "nurse_id", nullable = false)
    private Nurse nurse;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "task_type", nullable = false, length = 50)
    private String taskType; // MEDICATION_ADMINISTRATION, VITAL_CHECK, LAB_SAMPLE_COLLECTION, WOUND_CARE, PATIENT_EDUCATION, GENERAL_OBSERVATION

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String priority = "ROUTINE"; // ROUTINE, URGENT, EMERGENCY

    @Column(columnDefinition = "TEXT", nullable = false)
    private String instructions;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "ASSIGNED"; // ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED

    @Column(name = "due_time")
    private OffsetDateTime dueTime;

    @Column(name = "accepted_at")
    private OffsetDateTime acceptedAt;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "completion_notes", columnDefinition = "TEXT")
    private String completionNotes;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}

