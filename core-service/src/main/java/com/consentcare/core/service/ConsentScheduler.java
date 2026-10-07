package com.consentcare.core.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class ConsentScheduler {

    private final ConsentService consentService;

    /**
     * Periodically inspects active consents and transitions expired records,
     * emitting real-time notifications to doctors and patients and writing audit records.
     * Runs every 30 seconds.
     */
    @Scheduled(fixedDelay = 30000, initialDelay = 10000)
    public void scheduleConsentExpirationChecks() {
        try {
            int expiredCount = consentService.processConsentExpirations();
            if (expiredCount > 0) {
                log.info("ConsentScheduler processed {} expired consent record(s).", expiredCount);
            }
        } catch (Exception e) {
            log.error("ConsentScheduler execution error: {}", e.getMessage(), e);
        }
    }
}

