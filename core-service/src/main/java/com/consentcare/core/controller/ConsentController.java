package com.consentcare.core.controller;

import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.model.User;
import com.consentcare.core.service.ConsentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consents")
@RequiredArgsConstructor
public class ConsentController {

    private final ConsentService consentService;

    @PostMapping("/request")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<AccessRequestResponse> requestAccess(
            @Valid @RequestBody CreateAccessRequest req,
            @AuthenticationPrincipal User patientUser) {
        return ResponseEntity.ok(consentService.requestAccess(req, patientUser));
    }

    @PostMapping("/grant")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ConsentResponse> grantConsentDirectly(
            @Valid @RequestBody GrantConsentRequest req,
            @AuthenticationPrincipal User patientUser) {
        return ResponseEntity.ok(consentService.grantConsentDirectly(req, patientUser));
    }

    @PostMapping({"/{id}/revoke", "/revoke/{id}"})
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public ResponseEntity<ConsentResponse> revokeConsent(
            @PathVariable Long id,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(consentService.revokeConsent(id, actor));
    }

    @PostMapping("/revoke-doctor/{doctorId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<java.util.Map<String, Object>> revokeDoctorAccess(
            @PathVariable Long doctorId,
            @AuthenticationPrincipal User actor) {
        int count = consentService.revokeDoctorAccess(doctorId, actor);
        return ResponseEntity.ok(java.util.Map.of("message", "Access revoked for doctor", "revokedCount", count));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<ConsentResponse>> getMyConsents(@AuthenticationPrincipal User patientUser) {
        return ResponseEntity.ok(consentService.listConsentsForCurrentPatient(patientUser));
    }

    @GetMapping("/my-requests")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<AccessRequestResponse>> getMyAccessRequests(@AuthenticationPrincipal User patientUser) {
        return ResponseEntity.ok(consentService.listAccessRequestsForPatient(patientUser));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'MEDICAL_HISTORY')")
    public ResponseEntity<List<ConsentResponse>> listConsentsForPatient(
            @PathVariable Long patientId,
            @AuthenticationPrincipal User actor) {
        return ResponseEntity.ok(consentService.listConsentsForPatient(patientId, actor));
    }
}
