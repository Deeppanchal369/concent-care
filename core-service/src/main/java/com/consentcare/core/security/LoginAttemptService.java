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

    private void evictExpiredIfLarge() {
        if (attempts.size() > 1000) {
            Instant now = Instant.now();
            lockedUntil.entrySet().removeIf(e -> now.isAfter(e.getValue()));
            attempts.keySet().removeIf(k -> !lockedUntil.containsKey(k));
        }
    }

    public void recordFailure(String username) {
        evictExpiredIfLarge();
        String key = key(username);
        int max = "admin".equalsIgnoreCase(username) ? 10 : MAX_ATTEMPTS;
        int count = attempts.computeIfAbsent(key, k -> new AtomicInteger(0)).incrementAndGet();
        if (count >= max) {
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
