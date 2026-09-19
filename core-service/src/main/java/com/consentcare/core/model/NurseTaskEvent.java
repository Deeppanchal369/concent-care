package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "nurse_task_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NurseTaskEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "actor_nurse_id", nullable = false)
    private Long actorNurseId;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType; // ASSIGNED, ACCEPTED, STARTED, NOTE_ADDED, COMPLETED, CANCELLED

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private OffsetDateTime timestamp;
}

