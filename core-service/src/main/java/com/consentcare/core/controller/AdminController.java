package com.consentcare.core.controller;

import com.consentcare.core.dto.AuthDtos.*;
import com.consentcare.core.dto.CareDtos.AuditLogResponse;
import com.consentcare.core.model.Patient;
import com.consentcare.core.model.Role;
import com.consentcare.core.model.User;
import com.consentcare.core.repository.AuditLogRepository;
import com.consentcare.core.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AuthService authService;
    private final AuditLogRepository auditLogRepository;

    /**
     * Unified staff-creation endpoint. The frontend sends role=DOCTOR|NURSE|ADMIN
     * with optional specialization/licenseNumber/departmentId fields.
     * We dispatch to the appropriate AuthService method based on role.
     */
    @PostMapping("/users")
    public ResponseEntity<UserSummary> createStaff(@Valid @RequestBody CreateStaffRequest req,
                                                   @AuthenticationPrincipal User actingAdmin) {
        Role role;
        try {
            role = Role.valueOf(req.role().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + req.role() + ". Must be DOCTOR, NURSE, or ADMIN.");
        }

        UserSummary summary;
        if (role == Role.DOCTOR) {
            CreateDoctorRequest doctorReq = new CreateDoctorRequest(
                    req.username(), req.email(), req.password(), req.fullName(),
                    req.specialization() != null ? req.specialization() : "General Practice",
                    null,
                    req.departmentId(),
                    req.licenseNumber() != null ? req.licenseNumber() : "MD-PENDING"
            );
            DoctorSummary ds = authService.createDoctor(doctorReq, actingAdmin);
            summary = new UserSummary(ds.userId(), req.username(), ds.email(), ds.fullName(), Role.DOCTOR, true, "");
        } else if (role == Role.NURSE) {
            CreateNurseRequest nurseReq = new CreateNurseRequest(
                    req.username(), req.email(), req.password(), req.fullName(),
                    req.departmentId(), null
            );
            NurseSummary ns = authService.createNurse(nurseReq, actingAdmin);
            summary = new UserSummary(ns.userId(), req.username(), ns.email(), ns.fullName(), Role.NURSE, true, "");
        } else {
            // ADMIN role — create a plain admin user via the register path
            throw new IllegalArgumentException("Admin account creation must be performed directly in the database or via a dedicated provisioning tool.");
        }
        return ResponseEntity.ok(summary);
    }

    @PostMapping("/doctors")
    public ResponseEntity<DoctorSummary> createDoctor(@Valid @RequestBody CreateDoctorRequest req,
                                                      @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(authService.createDoctor(req, admin));
    }

    @PostMapping("/nurses")
    public ResponseEntity<NurseSummary> createNurse(@Valid @RequestBody CreateNurseRequest req,
                                                    @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(authService.createNurse(req, admin));
    }

    @PostMapping("/patients")
    public ResponseEntity<Patient> createWalkInPatient(@Valid @RequestBody CreateWalkInPatientRequest req,
                                                       @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(authService.createWalkInPatient(req, admin));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSummary>> listUsers(@AuthenticationPrincipal User actingAdmin) {
        return ResponseEntity.ok(authService.listUsers(actingAdmin));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<Void> updateUserStatus(@PathVariable Long id,
                                                 @RequestBody UpdateUserStatusRequest req,
                                                 @AuthenticationPrincipal User admin) {
        authService.updateUserStatus(id, req.active(), admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/assign-nurse")
    public ResponseEntity<Void> assignNurseToDoctor(@Valid @RequestBody AssignNurseRequest req,
                                                    @AuthenticationPrincipal User admin) {
        authService.assignNurseToDoctor(req.doctorId(), req.nurseId(), admin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/departments")
    public ResponseEntity<List<DepartmentSummary>> listDepartments() {
        return ResponseEntity.ok(authService.listDepartments());
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<Map<String, Object>> listAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("timestamp").descending());
        var pageResult = auditLogRepository.findAll(pageable);
        List<AuditLogResponse> logs = pageResult.getContent().stream()
                .map(a -> new AuditLogResponse(
                        a.getId(),
                        a.getActorUsername(),
                        a.getActorRole(),
                        a.getAction(),
                        a.getResourceType(),
                        a.getResourceId(),
                        a.getResult(),
                        a.getMetadataJson(),
                        a.getTimestamp()
                ))
                .toList();
        return ResponseEntity.ok(Map.of(
                "content", logs,
                "totalElements", pageResult.getTotalElements(),
                "totalPages", pageResult.getTotalPages(),
                "number", pageResult.getNumber()
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(Map.of(
                "message", "Stats endpoint active"
        ));
    }
}
