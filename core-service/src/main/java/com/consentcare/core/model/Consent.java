package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.envers.Audited;

import java.time.OffsetDateTime;

@Entity
@Table(name = "consents")
@Audited
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Consent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "doctor_id", nullable = false)
    private Long doctorId;

    @Column(name = "access_request_id")
    private Long accessRequestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ConsentCategory category;

    @Column(nullable = false)
    private String purpose;

    @Column(name = "granted_at", nullable = false)
    private OffsetDateTime grantedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ConsentStatus status = ConsentStatus.ACTIVE;

    public boolean isCurrentlyActive() {
        return !revoked && expiresAt != null && expiresAt.isAfter(OffsetDateTime.now());
    }
}

