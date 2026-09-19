package com.consentcare.core.security;

import com.consentcare.core.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Servlet filter that intercepts requests to sensitive endpoints and applies
 * rate limiting policies. If the client exceeds the quota, returns HTTP 429
 * with standard Retry-After and X-RateLimit-* headers.
 *
 * OWASP ASVS 5.0.0 V2.2.1, V13.1.4
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        RateLimiterService.Policy policy = resolvePolicy(path, request.getMethod());

        if (policy != null) {
            String clientIp = extractClientIp(request);
            String rateLimitKey = clientIp;

            // Enforce token consumption
            if (!rateLimiterService.tryAcquire(rateLimitKey, policy)) {
                long retryAfter = rateLimiterService.getRetryAfterSeconds(rateLimitKey, policy);
                log.warn("Rate limit exceeded for client IP {} on path {} (Policy: {})", clientIp, path, policy);

                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setHeader("Retry-After", String.valueOf(retryAfter));
                response.setHeader("X-RateLimit-Limit", String.valueOf(policy.getCapacity()));
                response.setHeader("X-RateLimit-Remaining", "0");

                ErrorResponse errorResponse = ErrorResponse.of(
                        "Too many requests. Please slow down and try again in " + retryAfter + " seconds.",
                        "RATE_LIMIT_EXCEEDED",
                        HttpStatus.TOO_MANY_REQUESTS.value(),
                        path
                );
                response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
                return;
            }

            // Populate rate limit headers for successful requests
            long remaining = rateLimiterService.getRemainingTokens(rateLimitKey, policy);
            response.setHeader("X-RateLimit-Limit", String.valueOf(policy.getCapacity()));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        }

        filterChain.doFilter(request, response);
    }

    private RateLimiterService.Policy resolvePolicy(String path, String method) {
        if ("/actuator/health".equals(path)) {
            return null; // Don't rate-limit health checks
        }
        if (path.startsWith("/api/auth/login")) {
            return RateLimiterService.Policy.AUTH_LOGIN;
        }
        if (path.startsWith("/api/auth/register")) {
            return RateLimiterService.Policy.AUTH_REGISTER;
        }
        if (path.startsWith("/api/documents/upload")) {
            return RateLimiterService.Policy.DOCUMENT_UPLOAD;
        }
        if (path.startsWith("/api/risk")) {
            return RateLimiterService.Policy.RISK_PREDICTION;
        }
        if (path.startsWith("/api/")) {
            return RateLimiterService.Policy.GENERAL_API;
        }
        return null;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // Take the first IP if multiple proxies are chained
            return xff.split(",")[0].trim();
        }
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr != null ? remoteAddr : "127.0.0.1";
    }
}

