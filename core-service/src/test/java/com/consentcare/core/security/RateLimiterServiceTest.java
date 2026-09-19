package com.consentcare.core.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterServiceTest {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
    }

    @Test
    void testAuthLoginRateLimitAllowsUpToCapacity() {
        String testIp = "192.168.1.100";
        RateLimiterService.Policy policy = RateLimiterService.Policy.AUTH_LOGIN;

        // Capacity is 10
        for (int i = 0; i < 10; i++) {
            assertTrue(rateLimiterService.tryAcquire(testIp, policy), "Request " + (i + 1) + " should be permitted");
        }

        // 11th request must be rejected
        assertFalse(rateLimiterService.tryAcquire(testIp, policy), "11th request must exceed rate limit");
        assertTrue(rateLimiterService.getRetryAfterSeconds(testIp, policy) > 0, "Retry-After must be greater than 0");
    }

    @Test
    void testDifferentKeysHaveIndependentBuckets() {
        String ip1 = "10.0.0.1";
        String ip2 = "10.0.0.2";
        RateLimiterService.Policy policy = RateLimiterService.Policy.AUTH_REGISTER;

        // Exhaust IP 1
        for (int i = 0; i < 15; i++) {
            assertTrue(rateLimiterService.tryAcquire(ip1, policy));
        }
        assertFalse(rateLimiterService.tryAcquire(ip1, policy));

        // IP 2 must still be able to acquire
        assertTrue(rateLimiterService.tryAcquire(ip2, policy));
    }

    @Test
    void testResetRestoresCapacity() {
        String ip = "172.16.0.5";
        RateLimiterService.Policy policy = RateLimiterService.Policy.DOCUMENT_UPLOAD;

        for (int i = 0; i < 20; i++) {
            assertTrue(rateLimiterService.tryAcquire(ip, policy));
        }
        assertFalse(rateLimiterService.tryAcquire(ip, policy));

        rateLimiterService.reset(ip, policy);
        assertTrue(rateLimiterService.tryAcquire(ip, policy), "After reset, acquisition must succeed");
    }
}

