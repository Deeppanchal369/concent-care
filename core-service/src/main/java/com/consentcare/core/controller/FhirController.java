package com.consentcare.core.controller;

import com.consentcare.core.service.FhirService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fhir")
@RequiredArgsConstructor
public class FhirController {

    private final FhirService fhirService;

    @GetMapping("/Patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(authentication, #patientId)")
    public ResponseEntity<Map<String, Object>> getPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(fhirService.getPatientResource(patientId));
    }

    @GetMapping("/Patient/{patientId}/$everything")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(authentication, #patientId)")
    public ResponseEntity<Map<String, Object>> getPatientEverything(@PathVariable Long patientId) {
        return ResponseEntity.ok(fhirService.getPatientEverythingBundle(patientId));
    }

    @GetMapping("/Practitioner/{userId}")
    public ResponseEntity<Map<String, Object>> getPractitioner(@PathVariable Long userId) {
        return ResponseEntity.ok(fhirService.getPractitionerResource(userId));
    }

    @GetMapping("/Observation")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(authentication, #patientId)")
    public ResponseEntity<List<Map<String, Object>>> getObservations(@RequestParam("patient") Long patientId) {
        return ResponseEntity.ok(fhirService.getObservationsForPatient(patientId));
    }

    @GetMapping("/Condition")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(authentication, #patientId)")
    public ResponseEntity<List<Map<String, Object>>> getConditions(@RequestParam("patient") Long patientId) {
        return ResponseEntity.ok(fhirService.getConditionsForPatient(patientId));
    }

    @GetMapping("/MedicationRequest")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(authentication, #patientId)")
    public ResponseEntity<List<Map<String, Object>>> getMedicationRequests(@RequestParam("patient") Long patientId) {
        return ResponseEntity.ok(fhirService.getMedicationRequestsForPatient(patientId));
    }
}

