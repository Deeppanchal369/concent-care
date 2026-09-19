package com.consentcare.core.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lightweight, in-memory brute-force guard on login attempts, keyed by
 * username (OWASP ASVS V2.2.1: resist automated credential guessing).
 */
@Component
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 15;

    private final ConcurrentHashMap<String, AtomicInteger> attempts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> lockedUntil = new ConcurrentHashMap<>();

    public void recordFailure(String username) {
        String key = key(username);
        int count = attempts.computeIfAbsent(key, k -> new AtomicInteger(0)).incrementAndGet();
        if (count >= MAX_ATTEMPTS) {
            lockedUntil.put(key, Instant.now().plusSeconds(LOCKOUT_MINUTES * 60));
        }
    }

    public void recordSuccess(String username) {
        String key = key(username);
        attempts.remove(key);
        lockedUntil.remove(key);
    }

    public boolean isLocked(String username) {
        Instant until = lockedUntil.get(key(username));
        if (until == null) return false;
        if (Instant.now().isAfter(until)) {
            attempts.remove(key(username));
            lockedUntil.remove(key(username));
            return false;
        }
        return true;
    }

    private String key(String username) {
        return username == null ? "" : username.toLowerCase();
    }
}
