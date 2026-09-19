package com.consentcare.core.dto;

import java.time.OffsetDateTime;

/**
 * The one shape every error response takes across the API. Deliberately
 * excludes stack traces, exception class names, and raw driver/library
 * messages (SQL errors, Hibernate messages, etc.) -- those are logged
 * server-side only, in GlobalExceptionHandler, never returned to the
 * client. This mirrors OWASP guidance on avoiding information disclosure
 * through error messages (OWASP Top 10 A05:2021 - Security
 * Misconfiguration).
 */
public record ErrorResponse(
        String error,
        String code,
        int status,
        String path,
        OffsetDateTime timestamp
) {
    public static ErrorResponse of(String error, String code, int status, String path) {
        return new ErrorResponse(error, code, status, path, OffsetDateTime.now());
    }
}
