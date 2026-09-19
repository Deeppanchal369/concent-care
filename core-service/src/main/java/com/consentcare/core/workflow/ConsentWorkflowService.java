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
        if (consent.getExpiresAt().isBefore(now.plusDays(3))) return ConsentStatus.EXPIRING_SOON;
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
