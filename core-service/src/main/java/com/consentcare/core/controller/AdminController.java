package com.consentcare.core.controller;

import com.consentcare.core.dto.AuthDtos.*;
import com.consentcare.core.dto.CareDtos.AuditLogResponse;
import com.consentcare.core.dto.DocumentDtos.DocumentDetailResponse;
import com.consentcare.core.model.DatasetRegistry;
import com.consentcare.core.model.ModelRegistry;
import com.consentcare.core.model.Patient;
import com.consentcare.core.model.Role;
import com.consentcare.core.model.User;
import com.consentcare.core.repository.AuditLogRepository;
import com.consentcare.core.service.AdminService;
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

    private final AdminService adminService;
    private final AuthService authService;
    private final AuditLogRepository auditLogRepository;

    // ==========================================
    // 1. Dashboard Statistics (24 real DB metrics)
    // ==========================================
    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // ==========================================
    // 2. User Management
    // ==========================================
    @GetMapping("/users")
    public ResponseEntity<List<UserSummary>> listUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(adminService.listUsers(query, role, active));
    }

    @GetMapping("/users/paged")
    public ResponseEntity<Map<String, Object>> listUsersPaged(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.listUsersPaged(query, role, active, page, size));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserSummary> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUser(id));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserSummary> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserProfileRequest req,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(adminService.updateUserProfile(id, req, admin));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetUserPassword(
            @PathVariable Long id,
            @Valid @RequestBody AdminPasswordResetRequest req,
            @AuthenticationPrincipal User admin) {
        adminService.resetUserPassword(id, req, admin);
        return ResponseEntity.ok(Map.of("message", "User password reset successfully."));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<Void> updateUserStatus(
            @PathVariable Long id,
            @RequestBody UpdateUserStatusRequest req,
            @AuthenticationPrincipal User admin) {
        authService.updateUserStatus(id, req.active(), admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users")
    public ResponseEntity<UserSummary> createStaff(
            @Valid @RequestBody CreateStaffRequest req,
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
            throw new IllegalArgumentException("Admin account creation must be performed directly via dedicated provisioning.");
        }
        return ResponseEntity.ok(summary);
    }

    @PostMapping("/doctors")
    public ResponseEntity<DoctorSummary> createDoctor(
            @Valid @RequestBody CreateDoctorRequest req,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(authService.createDoctor(req, admin));
    }

    @PostMapping("/nurses")
    public ResponseEntity<NurseSummary> createNurse(
            @Valid @RequestBody CreateNurseRequest req,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(authService.createNurse(req, admin));
    }

    @PostMapping("/patients")
    public ResponseEntity<Patient> createWalkInPatient(
            @Valid @RequestBody CreateWalkInPatientRequest req,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(authService.createWalkInPatient(req, admin));
    }

    // ==========================================
    // 3. Doctor & Care Team Management
    // ==========================================
    @GetMapping("/doctors")
    public ResponseEntity<List<DoctorCareTeamSummary>> listDoctors() {
        return ResponseEntity.ok(adminService.listDoctorsWithCareTeams());
    }

    @PostMapping("/doctors/{doctorId}/nurses/{nurseId}")
    public ResponseEntity<Map<String, String>> allocateNurseToDoctor(
            @PathVariable Long doctorId,
            @PathVariable Long nurseId,
            @AuthenticationPrincipal User admin) {
        adminService.allocateNurseToDoctor(doctorId, nurseId, admin);
        return ResponseEntity.ok(Map.of("message", "Nurse allocated to doctor care team successfully."));
    }

    @DeleteMapping("/doctors/{doctorId}/nurses/{nurseId}")
    public ResponseEntity<Map<String, String>> removeNurseFromDoctor(
            @PathVariable Long doctorId,
            @PathVariable Long nurseId,
            @AuthenticationPrincipal User admin) {
        adminService.removeNurseFromDoctor(doctorId, nurseId, admin);
        return ResponseEntity.ok(Map.of("message", "Nurse removed from doctor care team successfully."));
    }

    @PostMapping("/assign-nurse")
    public ResponseEntity<Void> assignNurseToDoctor(
            @Valid @RequestBody AssignNurseRequest req,
            @AuthenticationPrincipal User admin) {
        authService.assignNurseToDoctor(req.doctorId(), req.nurseId(), admin);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // 4. Nurse Management
    // ==========================================
    @GetMapping("/nurses")
    public ResponseEntity<List<NurseDetailSummary>> listNurses() {
        return ResponseEntity.ok(adminService.listNursesWithDetails());
    }

    // ==========================================
    // 5. Patient Directory (Audited Overview)
    // ==========================================
    @GetMapping("/patients")
    public ResponseEntity<Map<String, Object>> listPatients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String query) {
        return ResponseEntity.ok(adminService.listPatientsOverview(page, size, query));
    }

    // ==========================================
    // 6. Document Oversight Center
    // ==========================================
    @GetMapping("/documents")
    public ResponseEntity<Map<String, Object>> listDocuments(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(adminService.listDocumentsOverview(status, page, size));
    }

    @PostMapping("/documents/{id}/view")
    public ResponseEntity<DocumentDetailResponse> viewDocumentWithReason(
            @PathVariable Long id,
            @Valid @RequestBody AdminDocumentReasonRequest req,
            @AuthenticationPrincipal User admin) {
        return ResponseEntity.ok(adminService.viewDocumentWithReason(id, req.reason(), admin));
    }

    @PostMapping("/documents/{id}/remove")
    public ResponseEntity<Map<String, String>> removeDocument(
            @PathVariable Long id,
            @Valid @RequestBody AdminDocumentReasonRequest req,
            @AuthenticationPrincipal User admin) {
        adminService.removeDocument(id, req.reason(), admin);
        return ResponseEntity.ok(Map.of("message", "Document removed from clinical visibility and patient notified."));
    }

    @PostMapping("/documents/{id}/restore")
    public ResponseEntity<Map<String, String>> restoreDocument(
            @PathVariable Long id,
            @RequestBody(required = false) AdminDocumentReasonRequest req,
            @AuthenticationPrincipal User admin) {
        String reason = (req != null) ? req.reason() : "Restored by administrator";
        adminService.restoreDocument(id, reason, admin);
        return ResponseEntity.ok(Map.of("message", "Document restored to active status and patient notified."));
    }

    @GetMapping("/documents/{id}/actions")
    public ResponseEntity<List<AdminDocumentActionSummary>> getDocumentActionHistory(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getDocumentActionHistory(id));
    }

    // ==========================================
    // 7. AI Monitoring & Registry
    // ==========================================
    @GetMapping("/ai/datasets")
    public ResponseEntity<List<DatasetRegistry>> getDatasetRegistry() {
        return ResponseEntity.ok(adminService.getDatasetRegistry());
    }

    @GetMapping("/ai/models")
    public ResponseEntity<List<ModelRegistry>> getModelRegistry() {
        return ResponseEntity.ok(adminService.getModelRegistry());
    }

    @GetMapping("/ai/monitoring")
    public ResponseEntity<Map<String, Object>> getAiMonitoringStats() {
        return ResponseEntity.ok(adminService.getAiMonitoringStats());
    }

    // ==========================================
    // 8. General Administration & Audit Logs
    // ==========================================
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
}
