package com.consentcare.core.security;

import lombok.Getter;

/**
 * Thrown when an incoming request exceeds the configured rate limit threshold.
 * Maps to HTTP 429 (Too Many Requests) with Retry-After header.
 * ASVS 5.0.0 Control V2.2.1 / V13.1.4: Rate Limiting and Anti-Automation.
 */
@Getter
public class RateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

