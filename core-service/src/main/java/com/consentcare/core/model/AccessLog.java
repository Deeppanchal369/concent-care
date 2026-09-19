package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "access_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "actor_username", nullable = false, length = 100)
    private String actorUsername;

    @Column(name = "actor_role", nullable = false, length = 20)
    private String actorRole;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false, length = 10)
    private String decision; // ALLOW, DENY

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    @Builder.Default
    private boolean flagged = false;

    @Column(name = "accessed_at", nullable = false)
    private OffsetDateTime accessedAt;
}
