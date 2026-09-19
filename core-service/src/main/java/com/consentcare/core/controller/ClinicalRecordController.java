package com.consentcare.core.controller;

import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.dto.PageResponse;
import com.consentcare.core.model.User;
import com.consentcare.core.service.ClinicalRecordService;
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
@RequestMapping("/api/clinical")
@RequiredArgsConstructor
public class ClinicalRecordController {

    private final ClinicalRecordService clinicalRecordService;

    // --- ENCOUNTERS ---
    @PostMapping("/encounters")
    @PreAuthorize("hasRole('DOCTOR') and @consentSecurityEvaluator.canAccessPatient(authentication, #req.patientId(), 'CLINICAL_NOTES')")
    public ResponseEntity<EncounterResponse> createEncounter(@Valid @RequestBody CreateEncounterRequest req,
                                                               @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.createEncounter(req, user));
    }

    @PostMapping("/encounters/{id}/amend")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<EncounterResponse> amendEncounter(@PathVariable Long id,
                                                            @Valid @RequestBody AmendEncounterRequest req,
                                                            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.amendEncounter(id, req, user));
    }

    @GetMapping("/encounters/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'CLINICAL_NOTES')")
    public ResponseEntity<List<EncounterResponse>> listEncounters(@PathVariable Long patientId,
                                                                   @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.listEncounters(patientId, user));
    }

    @GetMapping("/encounters/patient/{patientId}/paged")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'CLINICAL_NOTES')")
    public ResponseEntity<PageResponse<EncounterResponse>> listEncountersPaged(
            @PathVariable Long patientId,
            @PageableDefault(size = 10, sort = "encounterDate", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.listEncountersPaged(patientId, pageable, user));
    }

    // --- DIAGNOSES ---
    @PostMapping("/diagnoses")
    @PreAuthorize("hasRole('DOCTOR') and @consentSecurityEvaluator.canAccessPatient(authentication, #req.patientId(), 'DIAGNOSES')")
    public ResponseEntity<DiagnosisResponse> addDiagnosis(@Valid @RequestBody CreateDiagnosisRequest req,
                                                           @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.addDiagnosis(req, user));
    }

    @PatchMapping("/diagnoses/{id}/status")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DiagnosisResponse> updateDiagnosisStatus(@PathVariable Long id,
                                                                   @Valid @RequestBody UpdateDiagnosisStatusRequest req,
                                                                   @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.updateDiagnosisStatus(id, req, user));
    }

    @GetMapping("/diagnoses/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'DIAGNOSES')")
    public ResponseEntity<List<DiagnosisResponse>> listDiagnoses(@PathVariable Long patientId,
                                                                 @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.listDiagnoses(patientId, user));
    }

    @GetMapping("/diagnoses/patient/{patientId}/paged")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'DIAGNOSES')")
    public ResponseEntity<PageResponse<DiagnosisResponse>> listDiagnosesPaged(
            @PathVariable Long patientId,
            @PageableDefault(size = 10, sort = "diagnosedDate", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.listDiagnosesPaged(patientId, pageable, user));
    }

    // --- LAB REQUESTS ---
    @PostMapping("/lab-requests")
    @PreAuthorize("hasRole('DOCTOR') and @consentSecurityEvaluator.canAccessPatient(authentication, #req.patientId(), 'LAB_REPORTS')")
    public ResponseEntity<LabRequestResponse> createLabRequest(@Valid @RequestBody CreateLabRequest req,
                                                               @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.createLabRequest(req, user));
    }

    @GetMapping("/lab-requests/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'LAB_REPORTS')")
    public ResponseEntity<List<LabRequestResponse>> listLabRequests(@PathVariable Long patientId,
                                                                   @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.listLabRequests(patientId, user));
    }

    @PatchMapping("/lab-requests/{requestId}/status")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('NURSE')")
    public ResponseEntity<LabRequestResponse> updateLabRequestStatus(@PathVariable Long requestId,
                                                                     @RequestBody Map<String, String> body,
                                                                     @AuthenticationPrincipal User user) {
        String status = body.getOrDefault("status", "COMPLETED");
        return ResponseEntity.ok(clinicalRecordService.updateLabRequestStatus(requestId, status, user));
    }

    // --- LAB REPORTS ---
    @PostMapping("/lab-reports")
    @PreAuthorize("(hasRole('DOCTOR') or hasRole('NURSE')) and @consentSecurityEvaluator.canAccessPatient(authentication, #req.patientId(), 'LAB_REPORTS')")
    public ResponseEntity<LabReportResponse> recordLabReport(@Valid @RequestBody RecordLabReportRequest req,
                                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.recordLabReport(req, user));
    }

    @GetMapping("/lab-reports/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'LAB_REPORTS')")
    public ResponseEntity<List<LabReportResponse>> listLabReports(@PathVariable Long patientId,
                                                                  @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.listLabReports(patientId, user));
    }

    @GetMapping("/lab-reports/patient/{patientId}/paged")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #patientId, 'LAB_REPORTS')")
    public ResponseEntity<PageResponse<LabReportResponse>> listLabReportsPaged(
            @PathVariable Long patientId,
            @PageableDefault(size = 10, sort = "reportedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.listLabReportsPaged(patientId, pageable, user));
    }

    // --- OBSERVATIONS / VITALS ---
    @PostMapping("/observations")
    @PreAuthorize("(hasRole('DOCTOR') or hasRole('NURSE')) and @consentSecurityEvaluator.canAccessPatientAny(authentication, #req.patientId())")
    public ResponseEntity<ObservationResponse> recordObservation(@Valid @RequestBody RecordObservationRequest req,
                                                                 @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.recordObservation(req, user));
    }

    @GetMapping("/observations/patient/{patientId}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(authentication, #patientId)")
    public ResponseEntity<List<ObservationResponse>> listObservations(@PathVariable Long patientId,
                                                                      @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clinicalRecordService.listObservations(patientId, user));
    }
}
