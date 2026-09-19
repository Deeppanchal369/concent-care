package com.consentcare.core.controller;

import com.consentcare.core.dto.AuthDtos.DoctorSummary;
import com.consentcare.core.dto.AuthDtos.NurseSummary;
import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.model.User;
import com.consentcare.core.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.consentcare.core.dto.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;
    private final com.consentcare.core.service.NurseService nurseService;

    @GetMapping
    public ResponseEntity<List<DoctorSummary>> searchDoctors(@RequestParam(value = "query", required = false) String query) {
        return ResponseEntity.ok(doctorService.searchDoctors(query));
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<DoctorSummary>> searchDoctorsPaged(
            @RequestParam(value = "query", required = false) String query,
            @PageableDefault(size = 10, sort = "user.fullName", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(doctorService.searchDoctorsPaged(query, pageable));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DoctorSummary> getMyDoctorProfile(@AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(doctorService.getDoctorByUserId(doctorUser.getId()));
    }

    @GetMapping("/my/patients")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<PatientResponse>> getMyAuthorizedPatients(@AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(doctorService.getAuthorizedPatients(doctorUser.getId()));
    }

    @GetMapping("/my/patients/paged")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<PageResponse<PatientResponse>> getMyAuthorizedPatientsPaged(
            @RequestParam(value = "query", required = false) String query,
            @PageableDefault(size = 10, sort = "fullName", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(doctorService.getAuthorizedPatientsPaged(doctorUser.getId(), query, pageable));
    }

    @GetMapping("/my/requests")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<AccessRequestResponse>> getPendingAccessRequests(@AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(doctorService.getPendingRequests(doctorUser.getId()));
    }

    @PostMapping("/requests/{id}/respond")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Void> respondToAccessRequest(
            @PathVariable Long id,
            @Valid @RequestBody RespondAccessRequest req,
            @AuthenticationPrincipal User doctorUser) {
        doctorService.respondToAccessRequest(id, req, doctorUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/my/tasks")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<NurseTaskResponse>> getMyDelegatedTasks(@AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(nurseService.getTasksForDoctor(doctorUser.getId()));
    }

    @GetMapping("/my/nurses")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<NurseSummary>> getMyNurseTeam(@AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(doctorService.getDoctorNurseTeam(doctorUser.getId()));
    }
}

