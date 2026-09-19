package com.consentcare.core.service;

import com.consentcare.core.dto.AuthDtos.DoctorSummary;
import com.consentcare.core.dto.AuthDtos.NurseSummary;
import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.dto.PageResponse;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final PatientDoctorRelationshipRepository relationshipRepository;
    private final AccessRequestRepository accessRequestRepository;
    private final ConsentRepository consentRepository;
    private final DoctorNurseAssignmentRepository assignmentRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public List<DoctorSummary> searchDoctors(String query) {
        List<Doctor> doctors = (query == null || query.trim().isBlank())
                ? doctorRepository.findAll()
                : doctorRepository.searchDoctors(query.trim());

        return doctors.stream()
                .map(this::toDoctorSummary)
                .toList();
    }

    public PageResponse<DoctorSummary> searchDoctorsPaged(String query, Pageable pageable) {
        Page<Doctor> page = doctorRepository.searchDoctorsPaged(query != null ? query.trim() : null, pageable);
        return PageResponse.from(page.map(this::toDoctorSummary));
    }

    public DoctorSummary getDoctorByUserId(Long userId) {
        Doctor d = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found for user: " + userId));
        return toDoctorSummary(d);
    }

    public List<PatientResponse> getAuthorizedPatients(Long userId) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        OffsetDateTime now = OffsetDateTime.now();

        // Strict privacy rule: Doctors ONLY see patients where an active, unrevoked, unexpired consent exists
        List<Long> allAuthorizedIds = consentRepository.findByDoctorId(doctor.getId()).stream()
                .filter(c -> !c.isRevoked() && c.getExpiresAt().isAfter(now))
                .map(Consent::getPatientId)
                .distinct()
                .toList();

        if (allAuthorizedIds.isEmpty()) {
            return List.of();
        }

        return patientRepository.findAllById(allAuthorizedIds).stream()
                .map(this::toPatientResponse)
                .toList();
    }

    public PageResponse<PatientResponse> getAuthorizedPatientsPaged(Long userId, String query, Pageable pageable) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        OffsetDateTime now = OffsetDateTime.now();

        List<Long> allAuthorizedIds = consentRepository.findByDoctorId(doctor.getId()).stream()
                .filter(c -> !c.isRevoked() && c.getExpiresAt().isAfter(now))
                .map(Consent::getPatientId)
                .distinct()
                .toList();

        if (allAuthorizedIds.isEmpty()) {
            return PageResponse.empty(pageable.getPageNumber(), pageable.getPageSize());
        }

        Page<Patient> page = (query != null && !query.trim().isBlank())
                ? patientRepository.findByIdInAndFullNameContainingIgnoreCase(allAuthorizedIds, query.trim(), pageable)
                : patientRepository.findByIdIn(allAuthorizedIds, pageable);

        return PageResponse.from(page.map(this::toPatientResponse));
    }

    public List<AccessRequestResponse> getPendingRequests(Long userId) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        return accessRequestRepository.findByDoctorIdAndStatusOrderByCreatedAtDesc(doctor.getId(), AccessRequestStatus.PENDING).stream()
                .map(this::toAccessRequestResponse)
                .toList();
    }

    @Transactional
    public void respondToAccessRequest(Long requestId, RespondAccessRequest req, User doctorUser) {
        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        AccessRequest accessRequest = accessRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Access request not found: " + requestId));

        if (!accessRequest.getDoctor().getId().equals(doctor.getId())) {
            throw new IllegalArgumentException("You are not authorized to respond to this access request.");
        }

        accessRequest.setStatus(req.status());
        accessRequest.setRespondedAt(OffsetDateTime.now());
        accessRequest.setReviewedBy(doctorUser);
        if (req.durationDays() != null && req.durationDays() > 0) {
            accessRequest.setDurationDays(req.durationDays());
        }
        accessRequestRepository.save(accessRequest);

        Patient patient = accessRequest.getPatient();

        if (req.status() == AccessRequestStatus.APPROVED) {
            // Establish relationship if not already active
            if (!relationshipRepository.existsByPatientIdAndDoctorIdAndStatus(patient.getId(), doctor.getId(), "ACTIVE")) {
                relationshipRepository.save(PatientDoctorRelationship.builder()
                        .patient(patient)
                        .doctor(doctor)
                        .status("ACTIVE")
                        .createdAt(OffsetDateTime.now())
                        .build());
            }

            int days = (req.durationDays() != null && req.durationDays() > 0) ? req.durationDays() : (accessRequest.getDurationDays() != null ? accessRequest.getDurationDays() : 30);
            OffsetDateTime expiresAt = OffsetDateTime.now().plusDays(days);

            // Parse categories and create consent records
            List<ConsentCategory> categories = Arrays.stream(accessRequest.getRequestedCategories().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .map(ConsentCategory::valueOf)
                    .toList();

            for (ConsentCategory cat : categories) {
                consentRepository.save(Consent.builder()
                        .patientId(patient.getId())
                        .doctorId(doctor.getId())
                        .accessRequestId(accessRequest.getId())
                        .category(cat)
                        .purpose("Authorized care access via approved request #" + accessRequest.getId())
                        .grantedAt(OffsetDateTime.now())
                        .expiresAt(expiresAt)
                        .status(ConsentStatus.ACTIVE)
                        .build());
            }

            if (patient.getLinkedUserId() != null) {
                notificationService.createNotification(
                        patient.getLinkedUserId(),
                        "ACCESS_APPROVED",
                        "Dr. " + doctorUser.getFullName() + " accepted your record access request",
                        "Dr. " + doctorUser.getFullName() + " can now view your authorized clinical records.",
                        "Doctor",
                        doctor.getId().toString()
                );
            }

            auditService.logAction(doctorUser.getUsername(), Role.DOCTOR.name(), "APPROVE_ACCESS_REQUEST", "AccessRequest", requestId.toString(), "SUCCESS", "Doctor approved patient access request");
        } else {
            if (patient.getLinkedUserId() != null) {
                notificationService.createNotification(
                        patient.getLinkedUserId(),
                        "ACCESS_REVOKED",
                        "Access request declined",
                        "Dr. " + doctorUser.getFullName() + " declined your access request.",
                        "Doctor",
                        doctor.getId().toString()
                );
            }
            auditService.logAction(doctorUser.getUsername(), Role.DOCTOR.name(), "REJECT_ACCESS_REQUEST", "AccessRequest", requestId.toString(), "SUCCESS", "Doctor declined patient access request");
        }
    }

    public List<NurseSummary> getDoctorNurseTeam(Long userId) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        return assignmentRepository.findByDoctorIdAndActiveTrue(doctor.getId()).stream()
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
    }

    private DoctorSummary toDoctorSummary(Doctor d) {
        return new DoctorSummary(
                d.getId(),
                d.getUser().getId(),
                d.getUser().getFullName(),
                d.getUser().getEmail(),
                d.getSpecialization(),
                d.getContactNumber(),
                d.getDepartment() != null ? d.getDepartment().getName() : "General",
                d.getLicenseNumber()
        );
    }

    private PatientResponse toPatientResponse(Patient p) {
        return new PatientResponse(
                p.getId(),
                p.getLinkedUserId(),
                p.getFullName(),
                p.getDateOfBirth(),
                p.getGender(),
                p.getPhone(),
                p.getEmail(),
                p.getAddress(),
                p.getEmergencyContact(),
                p.getBloodGroup(),
                p.getAllergies(),
                p.getChronicConditions(),
                p.getMedicalHistorySummary(),
                p.getCreatedAt()
        );
    }

    private AccessRequestResponse toAccessRequestResponse(AccessRequest ar) {
        List<ConsentCategory> cats = Arrays.stream(ar.getRequestedCategories().split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(ConsentCategory::valueOf)
                .toList();

        return new AccessRequestResponse(
                ar.getId(),
                ar.getPatient().getId(),
                ar.getPatient().getFullName(),
                ar.getDoctor().getId(),
                ar.getDoctor().getUser().getFullName(),
                ar.getDoctor().getSpecialization(),
                ar.getRequestedBy(),
                ar.getStatus(),
                cats,
                ar.getNotes(),
                ar.getDurationDays(),
                ar.getReviewedBy() != null ? ar.getReviewedBy().getId() : null,
                ar.getReviewedBy() != null ? ar.getReviewedBy().getFullName() : null,
                ar.getCreatedAt(),
                ar.getRespondedAt()
        );
    }
}

