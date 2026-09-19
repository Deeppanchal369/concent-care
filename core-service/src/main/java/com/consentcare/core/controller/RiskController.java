package com.consentcare.core.controller;

import com.consentcare.core.model.RiskPrediction;
import com.consentcare.core.model.User;
import com.consentcare.core.service.RiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Controller for Machine Learning Clinical Risk Assessment.
 * Strictly gated by Spring Boot authorization: doctors can only request or view
 * risk predictions for patients who have granted active consent covering RISK_ASSESSMENTS.
 */
@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
public class RiskController {

    private final RiskService riskService;
    private final WebClient riskServiceClient;

    @PostMapping("/patient/{patientId}")
    @PreAuthorize("hasRole('DOCTOR') and @consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'RISK_ASSESSMENTS')")
    public ResponseEntity<Map<String, Object>> predictForPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(riskService.predictForPatient(patientId, user));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'RISK_ASSESSMENTS')")
    public ResponseEntity<List<RiskPrediction>> listForPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(riskService.listPredictions(patientId, user));
    }

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        return ResponseEntity.ok(riskService.getModelMetrics());
    }

    /**
     * Diagnostic health check for risk-service connectivity, restricted to system administrators.
     */
    @GetMapping("/health")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Object> health() {
        try {
            Object result = riskServiceClient.get().uri("/health").retrieve().bodyToMono(Object.class).block();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "risk-service unreachable", "details", e.getMessage()));
        }
    }
}
