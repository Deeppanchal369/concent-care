package com.consentcare.core.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory Token Bucket rate limiter for sensitive endpoints.
 * Enforces anti-automation and resource exhaustion defenses.
 * 
 * Complies with:
 * - OWASP ASVS 5.0.0 V2.2.1: Anti-automation on authentication
 * - OWASP ASVS 5.0.0 V13.1.4: Rate limiting on API endpoints
 * - OWASP API Security Top 10:2023 API4 - Unrestricted Resource Consumption
 */
@Service
public class RateLimiterService {

    public enum Policy {
        AUTH_LOGIN(10, 10, 60),       // 10 requests per 60 seconds
        AUTH_REGISTER(15, 15, 60),    // 15 requests per 60 seconds
        DOCUMENT_UPLOAD(20, 20, 60),  // 20 requests per 60 seconds
        RISK_PREDICTION(30, 30, 60),  // 30 requests per 60 seconds
        GENERAL_API(120, 120, 60);    // 120 requests per 60 seconds

        private final long capacity;
        private final double refillRatePerSecond;
        private final long windowSeconds;

        Policy(long capacity, long refillCount, long windowSeconds) {
            this.capacity = capacity;
            this.refillRatePerSecond = (double) refillCount / windowSeconds;
            this.windowSeconds = windowSeconds;
        }

        public long getCapacity() {
            return capacity;
        }

        public double getRefillRatePerSecond() {
            return refillRatePerSecond;
        }

        public long getWindowSeconds() {
            return windowSeconds;
        }
    }

    private static class TokenBucket {
        private double tokens;
        private long lastRefillTimestamp;

        TokenBucket(long capacity) {
            this.tokens = capacity;
            this.lastRefillTimestamp = System.currentTimeMillis();
        }

        synchronized boolean tryConsume(Policy policy) {
            refill(policy);
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        synchronized long getRemainingTokens(Policy policy) {
            refill(policy);
            return (long) tokens;
        }

        synchronized long getSecondsUntilNextToken(Policy policy) {
            refill(policy);
            if (tokens >= 1.0) {
                return 0;
            }
            double needed = 1.0 - tokens;
            return Math.max(1, (long) Math.ceil(needed / policy.getRefillRatePerSecond()));
        }

        private void refill(Policy policy) {
            long now = System.currentTimeMillis();
            long elapsedMillis = now - lastRefillTimestamp;
            if (elapsedMillis > 0) {
                double tokensToAdd = (elapsedMillis / 1000.0) * policy.getRefillRatePerSecond();
                tokens = Math.min(policy.getCapacity(), tokens + tokensToAdd);
                lastRefillTimestamp = now;
            }
        }
    }

    private final ConcurrentHashMap<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    /**
     * Attempts to acquire 1 token for the specified key and policy.
     *
     * @param key Client IP or user identifier combined with policy scope
     * @param policy Rate limit policy definition
     * @return true if token was acquired; false if rate limit exceeded
     */
    public boolean tryAcquire(String key, Policy policy) {
        String bucketKey = policy.name() + ":" + key;
        TokenBucket bucket = buckets.computeIfAbsent(bucketKey, k -> new TokenBucket(policy.getCapacity()));
        return bucket.tryConsume(policy);
    }

    /**
     * Calculates the estimated wait time in seconds before a token becomes available.
     */
    public long getRetryAfterSeconds(String key, Policy policy) {
        String bucketKey = policy.name() + ":" + key;
        TokenBucket bucket = buckets.get(bucketKey);
        if (bucket == null) {
            return 0;
        }
        return bucket.getSecondsUntilNextToken(policy);
    }

    /**
     * Gets available tokens remaining in the bucket.
     */
    public long getRemainingTokens(String key, Policy policy) {
        String bucketKey = policy.name() + ":" + key;
        TokenBucket bucket = buckets.computeIfAbsent(bucketKey, k -> new TokenBucket(policy.getCapacity()));
        return bucket.getRemainingTokens(policy);
    }

    /**
     * Resets a specific key's bucket (useful for testing or administrative unlock).
     */
    public void reset(String key, Policy policy) {
        buckets.remove(policy.name() + ":" + key);
    }

    /**
     * Clears all buckets.
     */
    public void clear() {
        buckets.clear();
    }
}

