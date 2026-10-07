package com.consentcare.core.service;

import com.consentcare.core.dto.AuthDtos.*;
import com.consentcare.core.dto.DocumentDtos.DocumentDetailResponse;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final NurseRepository nurseRepository;
    private final PatientRepository patientRepository;
    private final ConsentRepository consentRepository;
    private final EncounterRepository encounterRepository;
    private final LabReportRepository labReportRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final ObservationRepository observationRepository;
    private final DocumentRepository documentRepository;
    private final AdminDocumentActionRepository adminDocumentActionRepository;
    private final DoctorNurseAssignmentRepository assignmentRepository;
    private final NurseTaskRepository nurseTaskRepository;
    private final AuditLogRepository auditLogRepository;
    private final DatasetRegistryRepository datasetRegistryRepository;
    private final ModelRegistryRepository modelRegistryRepository;
    private final ClinicalIntelligenceRunRepository clinicalIntelligenceRunRepository;
    private final DocumentExtractedFactRepository factRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final DocumentService documentService;

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        // 1. User & Account Statistics
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByActiveTrue();
        long suspendedUsers = userRepository.countByActiveFalse();
        long doctorsCount = doctorRepository.count();
        long nursesCount = nurseRepository.count();
        long patientsCount = patientRepository.count();
        long adminsCount = userRepository.countByRole(Role.ADMIN);

        stats.put("totalUsers", totalUsers);
        stats.put("activeUsers", activeUsers);
        stats.put("suspendedUsers", suspendedUsers);
        stats.put("lockedUsers", 0L);
        stats.put("doctorsCount", doctorsCount);
        stats.put("nursesCount", nursesCount);
        stats.put("patientsCount", patientsCount);
        stats.put("adminsCount", adminsCount);

        // 2. Consent & Privacy Statistics
        long totalConsents = consentRepository.count();
        long activeConsents = consentRepository.countByStatus(ConsentStatus.ACTIVE);
        long expiredConsents = consentRepository.countByStatus(ConsentStatus.EXPIRED);
        long revokedConsents = consentRepository.countByRevokedTrue();

        stats.put("totalConsentsCount", totalConsents);
        stats.put("activeConsentsCount", activeConsents);
        stats.put("expiredConsentsCount", expiredConsents);
        stats.put("revokedConsentsCount", revokedConsents);

        // 3. Clinical Data Volume
        long totalEncounters = encounterRepository.count();
        long totalLabReports = labReportRepository.count();
        long totalPrescriptions = prescriptionRepository.count();
        long totalVitals = observationRepository.count();

        stats.put("totalEncountersCount", totalEncounters);
        stats.put("totalLabReportsCount", totalLabReports);
        stats.put("totalPrescriptionsCount", totalPrescriptions);
        stats.put("totalVitalsCount", totalVitals);

        // 4. Document Oversight
        long totalDocs = documentRepository.count();
        long activeDocs = documentRepository.countByAdminStatus("ACTIVE");
        long removedDocs = documentRepository.countByAdminStatus("REMOVED_BY_ADMIN");
        long pendingAiDocs = documentRepository.countByAiStatus(ProcessingStatus.PENDING);

        stats.put("totalDocumentsCount", totalDocs);
        stats.put("activeDocumentsCount", activeDocs);
        stats.put("removedDocumentsCount", removedDocs);
        stats.put("pendingAiDocumentsCount", pendingAiDocs);

        // 5. Care Team Allocations & Nurse Tasks
        long activeAllocations = assignmentRepository.countByActiveTrue();
        long activeNurseTasks = nurseTaskRepository.countByStatusIn(List.of("PENDING", "IN_PROGRESS", "ASSIGNED"));
        long completedNurseTasks = nurseTaskRepository.countByStatus("COMPLETED");

        stats.put("activeAllocationsCount", activeAllocations);
        stats.put("activeNurseTasksCount", activeNurseTasks);
        stats.put("completedNurseTasksCount", completedNurseTasks);

        // 6. Security & Audit
        long totalAuditLogs = auditLogRepository.count();
        long totalDocActions = adminDocumentActionRepository.count();
        long totalAiRuns = clinicalIntelligenceRunRepository.count();

        stats.put("totalAuditLogsCount", totalAuditLogs);
        stats.put("totalDocumentActionsCount", totalDocActions);
        stats.put("totalAiRunsCount", totalAiRuns);

        return stats;
    }

    public List<UserSummary> listUsers(String query, String roleStr, Boolean active) {
        List<User> users = userRepository.findAll();
        String q = (query != null) ? query.trim().toLowerCase() : "";

        return users.stream()
                .filter(u -> {
                    if (!q.isEmpty()) {
                        boolean matchName = u.getFullName() != null && u.getFullName().toLowerCase().contains(q);
                        boolean matchUser = u.getUsername() != null && u.getUsername().toLowerCase().contains(q);
                        boolean matchEmail = u.getEmail() != null && u.getEmail().toLowerCase().contains(q);
                        if (!matchName && !matchUser && !matchEmail) return false;
                    }
                    if (roleStr != null && !roleStr.isBlank()) {
                        if (!u.getRole().name().equalsIgnoreCase(roleStr)) return false;
                    }
                    if (active != null) {
                        if (u.isActive() != active) return false;
                    }
                    return true;
                })
                .map(u -> new UserSummary(
                        u.getId(),
                        u.getUsername(),
                        u.getEmail(),
                        u.getFullName(),
                        u.getRole(),
                        u.isActive(),
                        u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
                ))
                .toList();
    }

    public Map<String, Object> listUsersPaged(String query, String roleStr, Boolean active, int page, int size) {
        List<UserSummary> all = listUsers(query, roleStr, active);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int totalElements = all.size();
        int totalPages = (totalElements == 0) ? 0 : (int) Math.ceil((double) totalElements / safeSize);
        int fromIndex = Math.min(safePage * safeSize, totalElements);
        int toIndex = Math.min(fromIndex + safeSize, totalElements);
        List<UserSummary> pageContent = all.subList(fromIndex, toIndex);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("content", pageContent);
        res.put("totalElements", totalElements);
        res.put("totalPages", totalPages);
        res.put("number", safePage);
        res.put("size", safeSize);
        return res;
    }

    public UserSummary getUser(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
        return new UserSummary(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getFullName(),
                u.getRole(),
                u.isActive(),
                u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
        );
    }

    @Transactional
    public UserSummary updateUserProfile(Long userId, UpdateUserProfileRequest req, User admin) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (req.fullName() != null && !req.fullName().isBlank()) {
            target.setFullName(req.fullName().trim());
        }
        if (req.email() != null && !req.email().isBlank()) {
            target.setEmail(req.email().trim().toLowerCase());
        }
        if (req.active() != null) {
            target.setActive(req.active());
        }
        userRepository.save(target);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "UPDATE_USER_PROFILE",
                "User", userId.toString(), "SUCCESS", "Updated profile for user " + target.getUsername());

        return new UserSummary(
                target.getId(),
                target.getUsername(),
                target.getEmail(),
                target.getFullName(),
                target.getRole(),
                target.isActive(),
                target.getCreatedAt() != null ? target.getCreatedAt().toString() : ""
        );
    }

    @Transactional
    public void resetUserPassword(Long userId, AdminPasswordResetRequest req, User admin) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        target.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(target);

        String note = (req.reason() != null && !req.reason().isBlank()) ? req.reason() : "Administrative password reset";
        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "ADMIN_PASSWORD_RESET",
                "User", userId.toString(), "SUCCESS", note);
    }

    public List<DoctorCareTeamSummary> listDoctorsWithCareTeams() {
        List<Doctor> doctors = doctorRepository.findAll();
        List<DoctorCareTeamSummary> result = new ArrayList<>();

        for (Doctor d : doctors) {
            List<DoctorNurseAssignment> assignments = assignmentRepository.findByDoctorIdAndActiveTrue(d.getId());
            List<NurseSummary> nurses = assignments.stream()
                    .map(a -> {
                        Nurse n = a.getNurse();
                        return new NurseSummary(
                                n.getId(),
                                n.getUser().getId(),
                                n.getUser().getFullName(),
                                n.getUser().getEmail(),
                                n.getDepartment() != null ? n.getDepartment().getName() : "General",
                                n.getAvailabilityStatus(),
                                n.getContactNumber()
                        );
                    })
                    .toList();

            result.add(new DoctorCareTeamSummary(
                    d.getId(),
                    d.getUser().getId(),
                    d.getUser().getFullName(),
                    d.getUser().getEmail(),
                    d.getSpecialization(),
                    d.getDepartment() != null ? d.getDepartment().getName() : "General",
                    d.getLicenseNumber(),
                    d.getContactNumber(),
                    nurses
            ));
        }
        return result;
    }

    @Transactional
    public void allocateNurseToDoctor(Long doctorId, Long nurseId, User admin) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found: " + doctorId));
        Nurse nurse = nurseRepository.findById(nurseId)
                .orElseThrow(() -> new IllegalArgumentException("Nurse not found: " + nurseId));

        DoctorNurseAssignment assignment = assignmentRepository.findByDoctorIdAndNurseId(doctorId, nurseId)
                .orElseGet(() -> DoctorNurseAssignment.builder().doctor(doctor).nurse(nurse).build());

        assignment.setActive(true);
        assignment.setAssignedAt(OffsetDateTime.now());
        assignmentRepository.save(assignment);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "ALLOCATE_NURSE_CARE_TEAM",
                "DoctorNurseAssignment", doctorId + "-" + nurseId, "SUCCESS",
                "Allocated Nurse " + nurse.getUser().getFullName() + " to Doctor " + doctor.getUser().getFullName() + "'s care team");
    }

    @Transactional
    public void removeNurseFromDoctor(Long doctorId, Long nurseId, User admin) {
        DoctorNurseAssignment assignment = assignmentRepository.findByDoctorIdAndNurseId(doctorId, nurseId)
                .orElseThrow(() -> new IllegalArgumentException("Active allocation not found between doctor " + doctorId + " and nurse " + nurseId));

        assignment.setActive(false);
        assignmentRepository.save(assignment);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "DEALLOCATE_NURSE_CARE_TEAM",
                "DoctorNurseAssignment", doctorId + "-" + nurseId, "SUCCESS",
                "Removed nurse from doctor's care team");
    }

    public List<NurseDetailSummary> listNursesWithDetails() {
        List<Nurse> nurses = nurseRepository.findAll();
        List<NurseDetailSummary> result = new ArrayList<>();

        for (Nurse n : nurses) {
            long activeTasks = nurseTaskRepository.countByNurseIdAndStatusIn(n.getId(), List.of("PENDING", "IN_PROGRESS", "ASSIGNED"));
            List<DoctorNurseAssignment> assignments = assignmentRepository.findByNurseIdAndActiveTrue(n.getId());
            List<String> doctorNames = assignments.stream()
                    .map(a -> a.getDoctor().getUser().getFullName())
                    .toList();

            result.add(new NurseDetailSummary(
                    n.getId(),
                    n.getUser().getId(),
                    n.getUser().getFullName(),
                    n.getUser().getEmail(),
                    n.getDepartment() != null ? n.getDepartment().getName() : "General",
                    n.getAvailabilityStatus(),
                    n.getContactNumber(),
                    activeTasks,
                    doctorNames
            ));
        }
        return result;
    }

    public Map<String, Object> listPatientsOverview(int page, int size, String query) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100), Sort.by("fullName").ascending());
        Page<Patient> pPage;
        if (query != null && !query.isBlank()) {
            pPage = patientRepository.findByIdInAndFullNameContainingIgnoreCase(
                    patientRepository.findAll().stream().map(Patient::getId).toList(), query.trim(), pageable);
        } else {
            pPage = patientRepository.findAll(pageable);
        }

        List<PatientAdminSummary> summaries = pPage.getContent().stream()
                .map(p -> {
                    long docCount = documentRepository.findByPatientId(p.getId()).size();
                    long consentCount = consentRepository.findByPatientId(p.getId()).size();
                    return new PatientAdminSummary(
                            p.getId(),
                            p.getLinkedUserId(),
                            p.getFullName(),
                            p.getDateOfBirth() != null ? p.getDateOfBirth().toString() : "",
                            p.getGender() != null ? p.getGender() : "",
                            p.getPhone(),
                            p.getEmail(),
                            p.getCreatedAt() != null ? p.getCreatedAt().toString() : "",
                            docCount,
                            consentCount
                    );
                })
                .toList();

        return Map.of(
                "content", summaries,
                "totalElements", pPage.getTotalElements(),
                "totalPages", pPage.getTotalPages(),
                "page", pPage.getNumber()
        );
    }

    public Map<String, Object> listDocumentsOverview(String statusFilter, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100), Sort.by("uploadedAt").descending());
        Page<Document> docPage;
        if (statusFilter != null && !statusFilter.isBlank() && !statusFilter.equalsIgnoreCase("ALL")) {
            docPage = documentRepository.findByAdminStatus(statusFilter.toUpperCase(), pageable);
        } else {
            docPage = documentRepository.findAll(pageable);
        }

        List<DocumentAdminSummary> summaries = docPage.getContent().stream()
                .map(d -> {
                    String patientName = patientRepository.findById(d.getPatientId())
                            .map(Patient::getFullName)
                            .orElse("Patient #" + d.getPatientId());

                    String removedByName = null;
                    if (d.getRemovedBy() != null) {
                        removedByName = userRepository.findById(d.getRemovedBy())
                                .map(User::getFullName)
                                .orElse("Admin #" + d.getRemovedBy());
                    }

                    return new DocumentAdminSummary(
                            d.getId(),
                            d.getPatientId(),
                            patientName,
                            d.getTitle() != null ? d.getTitle() : d.getFileName(),
                            d.getOriginalFilename(),
                            d.getFileName(),
                            d.getContentType(),
                            d.getFileSize(),
                            d.getCategory(),
                            d.getAdminStatus(),
                            d.getRemovalReason(),
                            d.getRemovedBy(),
                            removedByName,
                            d.getRemovedAt() != null ? d.getRemovedAt().toString() : null,
                            d.getUploadedAt().toString()
                    );
                })
                .toList();

        return Map.of(
                "content", summaries,
                "totalElements", docPage.getTotalElements(),
                "totalPages", docPage.getTotalPages(),
                "page", docPage.getNumber()
        );
    }

    @Transactional
    public DocumentDetailResponse viewDocumentWithReason(Long documentId, String administrativeReason, User admin) {
        if (administrativeReason == null || administrativeReason.trim().length() < 5) {
            throw new IllegalArgumentException("A valid administrative reason (minimum 5 characters) is required to inspect document records.");
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        AdminDocumentAction action = AdminDocumentAction.builder()
                .documentId(doc.getId())
                .adminUserId(admin.getId())
                .actionType("VIEW_CONTENT")
                .administrativeReason(administrativeReason.trim())
                .timestamp(OffsetDateTime.now())
                .result("SUCCESS")
                .build();
        adminDocumentActionRepository.save(action);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "ADMIN_VIEW_DOCUMENT",
                "Document", documentId.toString(), "SUCCESS", administrativeReason.trim());

        return documentService.getDocumentDetailForAdmin(documentId, admin);
    }

    @Transactional
    public void removeDocument(Long documentId, String removalReason, User admin) {
        if (removalReason == null || removalReason.trim().length() < 5) {
            throw new IllegalArgumentException("A transparent removal reason (minimum 5 characters) is required to remove a document.");
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        doc.setAdminStatus("REMOVED_BY_ADMIN");
        doc.setRemovalReason(removalReason.trim());
        doc.setRemovedBy(admin.getId());
        doc.setRemovedAt(OffsetDateTime.now());
        documentRepository.save(doc);

        AdminDocumentAction action = AdminDocumentAction.builder()
                .documentId(doc.getId())
                .adminUserId(admin.getId())
                .actionType("REMOVE")
                .administrativeReason(removalReason.trim())
                .timestamp(OffsetDateTime.now())
                .result("SUCCESS")
                .build();
        adminDocumentActionRepository.save(action);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "ADMIN_REMOVE_DOCUMENT",
                "Document", documentId.toString(), "SUCCESS", "Removed document: " + removalReason.trim());

        // Transparent notification to the patient
        patientRepository.findById(doc.getPatientId()).ifPresent(p -> {
            if (p.getLinkedUserId() != null) {
                notificationService.createNotification(
                        p.getLinkedUserId(),
                        "DOCUMENT_REMOVED_BY_ADMIN",
                        "Document Removed by Administrator",
                        "Your document '" + (doc.getTitle() != null ? doc.getTitle() : doc.getFileName()) +
                                "' was removed by an administrator. Reason: " + removalReason.trim(),
                        "Document",
                        doc.getId().toString()
                );
            }
        });
    }

    @Transactional
    public void restoreDocument(Long documentId, String reason, User admin) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        doc.setAdminStatus("ACTIVE");
        doc.setRestoredBy(admin.getId());
        doc.setRestoredAt(OffsetDateTime.now());
        documentRepository.save(doc);

        String actReason = (reason != null && !reason.isBlank()) ? reason.trim() : "Restored to active clinical status by administrator";
        AdminDocumentAction action = AdminDocumentAction.builder()
                .documentId(doc.getId())
                .adminUserId(admin.getId())
                .actionType("RESTORE")
                .administrativeReason(actReason)
                .timestamp(OffsetDateTime.now())
                .result("SUCCESS")
                .build();
        adminDocumentActionRepository.save(action);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "ADMIN_RESTORE_DOCUMENT",
                "Document", documentId.toString(), "SUCCESS", actReason);

        patientRepository.findById(doc.getPatientId()).ifPresent(p -> {
            if (p.getLinkedUserId() != null) {
                notificationService.createNotification(
                        p.getLinkedUserId(),
                        "DOCUMENT_RESTORED",
                        "Document Restored",
                        "Your document '" + (doc.getTitle() != null ? doc.getTitle() : doc.getFileName()) +
                                "' has been restored to active status.",
                        "Document",
                        doc.getId().toString()
                );
            }
        });
    }

    public List<AdminDocumentActionSummary> getDocumentActionHistory(Long documentId) {
        return adminDocumentActionRepository.findByDocumentIdOrderByTimestampDesc(documentId).stream()
                .map(a -> {
                    String adminUser = userRepository.findById(a.getAdminUserId())
                            .map(User::getUsername)
                            .orElse("admin#" + a.getAdminUserId());

                    return new AdminDocumentActionSummary(
                            a.getId(),
                            a.getDocumentId(),
                            a.getAdminUserId(),
                            adminUser,
                            a.getActionType(),
                            a.getAdministrativeReason(),
                            a.getTimestamp().toString(),
                            a.getResult()
                    );
                })
                .toList();
    }

    public List<DatasetRegistry> getDatasetRegistry() {
        return datasetRegistryRepository.findAll();
    }

    public List<ModelRegistry> getModelRegistry() {
        return modelRegistryRepository.findAll();
    }

    public Map<String, Object> getAiMonitoringStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total_longitudinal_runs", clinicalIntelligenceRunRepository.count());
        stats.put("total_candidate_facts", factRepository.count());
        stats.put("confirmed_facts", factRepository.countByStatus(FactStatus.CONFIRMED));
        stats.put("pending_review_facts", factRepository.countByStatus(FactStatus.PENDING));
        stats.put("rejected_facts", factRepository.countByStatus(FactStatus.REJECTED));
        stats.put("registered_datasets_count", datasetRegistryRepository.count());
        stats.put("registered_models_count", modelRegistryRepository.count());
        return stats;
    }
}
