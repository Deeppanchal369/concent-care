package com.consentcare.core.controller;

import com.consentcare.core.model.User;
import com.consentcare.core.service.ClinicalIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/clinical-insights")
@RequiredArgsConstructor
public class ClinicalIntelligenceController {

    private final ClinicalIntelligenceService clinicalIntelligenceService;

    @PostMapping("/{patientId}")
    @PreAuthorize("hasRole('DOCTOR') and (@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'AI_SUMMARIES') or @consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'RISK_ASSESSMENTS') or @consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'ENTIRE_RECORD'))")
    public ResponseEntity<Map<String, Object>> generateInsights(
            @PathVariable Long patientId,
            @RequestParam(required = false, defaultValue = "en") String language,
            @AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(clinicalIntelligenceService.generateInsights(patientId, language, doctorUser));
    }

    @GetMapping("/{patientId}/latest")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'AI_SUMMARIES') or @consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'RISK_ASSESSMENTS') or @consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'ENTIRE_RECORD')")
    public ResponseEntity<?> getLatestInsights(@PathVariable Long patientId) {
        return clinicalIntelligenceService.getLatestRun(patientId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}

