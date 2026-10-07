package com.consentcare.core.workflow;

import com.consentcare.core.model.Consent;
import com.consentcare.core.model.ConsentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class ConsentWorkflowService {

    /** Derives the current lifecycle state of a consent record from its data. */
    public ConsentStatus deriveState(Consent consent) {
        if (consent.isRevoked()) return ConsentStatus.REVOKED;
        OffsetDateTime now = OffsetDateTime.now();
        if (consent.getExpiresAt().isBefore(now)) return ConsentStatus.EXPIRED;

        // Proportional expiring soon threshold:
        // For short duration (<= 24h) consents like 1-hour access: expiring soon when <= 15 minutes left
        // For long duration (> 24h) consents: expiring soon when <= 3 days left
        if (consent.getGrantedAt() != null) {
            long totalMinutes = java.time.Duration.between(consent.getGrantedAt(), consent.getExpiresAt()).toMinutes();
            long remainingMinutes = java.time.Duration.between(now, consent.getExpiresAt()).toMinutes();
            if (totalMinutes <= 1440) { // 24 hours or less
                if (remainingMinutes <= 15) return ConsentStatus.EXPIRING_SOON;
            } else {
                if (consent.getExpiresAt().isBefore(now.plusDays(3))) return ConsentStatus.EXPIRING_SOON;
            }
        } else {
            if (consent.getExpiresAt().isBefore(now.plusMinutes(15))) return ConsentStatus.EXPIRING_SOON;
        }

        return ConsentStatus.ACTIVE;
    }

    /** True only for states from which access may legitimately be granted. */
    public boolean isAccessPermitted(ConsentStatus state) {
        return state == ConsentStatus.ACTIVE || state == ConsentStatus.EXPIRING_SOON;
    }

    public String statusLabel(Consent consent) {
        return deriveState(consent).name();
    }
}
