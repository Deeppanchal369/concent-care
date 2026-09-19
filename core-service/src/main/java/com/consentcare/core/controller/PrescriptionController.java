package com.consentcare.core.controller;

import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.dto.PageResponse;
import com.consentcare.core.model.User;
import com.consentcare.core.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    @PreAuthorize("hasRole('DOCTOR') and @consentSecurityEvaluator.canAccessPatient(authentication, #req.patientId(), 'PRESCRIPTIONS')")
    public ResponseEntity<PrescriptionResponse> create(@Valid @RequestBody CreatePrescriptionRequest req,
                                                       @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(prescriptionService.create(req, user));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'PRESCRIPTIONS')")
    public ResponseEntity<List<PrescriptionResponse>> listForPatient(@PathVariable Long patientId,
                                                                     @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(prescriptionService.listForPatient(patientId, user));
    }

    @GetMapping("/patient/{patientId}/paged")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'PRESCRIPTIONS')")
    public ResponseEntity<PageResponse<PrescriptionResponse>> listForPatientPaged(
            @PathVariable Long patientId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(prescriptionService.listForPatientPaged(patientId, pageable, user));
    }

    @PostMapping("/administrations")
    @PreAuthorize("hasRole('NURSE') or hasRole('DOCTOR')")
    public ResponseEntity<Map<String, Object>> recordAdministration(@Valid @RequestBody RecordAdministrationRequest req,
                                                                    @AuthenticationPrincipal User user) {
        prescriptionService.recordAdministration(req, user);
        return ResponseEntity.ok(Map.of("message", "Medication administration recorded successfully"));
    }
}
