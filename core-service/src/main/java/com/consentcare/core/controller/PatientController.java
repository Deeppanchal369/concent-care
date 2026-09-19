package com.consentcare.core.controller;

import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.dto.PageResponse;
import com.consentcare.core.model.Role;
import com.consentcare.core.model.User;
import com.consentcare.core.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    /** Clinic-wide patient list -- staff only, patients have no reason to see the full directory. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PatientResponse>> listAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(patientService.listAll(user));
    }

    /** A logged-in patient's own profile, resolved dynamically from their JWT identity. */
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PatientResponse> getMine(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(patientService.getMine(user.getId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatient(authentication, #id, 'MEDICAL_HISTORY')")
    public ResponseEntity<PatientResponse> getById(@PathVariable Long id, @AuthenticationPrincipal User user) {
        if (user.getRole() == Role.PATIENT) {
            PatientResponse mine = patientService.getMine(user.getId());
            if (!mine.id().equals(id)) {
                throw new AccessDeniedException("Patients can only view their own record.");
            }
            return ResponseEntity.ok(mine);
        }
        return ResponseEntity.ok(patientService.getById(id, user));
    }

    @GetMapping("/{id}/activity")
    @PreAuthorize("@consentSecurityEvaluator.canAccessPatientAny(authentication, #id)")
    public ResponseEntity<PageResponse<PatientActivityResponse>> getActivity(
            @PathVariable Long id,
            @PageableDefault(size = 15, sort = "accessedAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(patientService.getPatientActivityPaged(id, pageable, user));
    }
}
