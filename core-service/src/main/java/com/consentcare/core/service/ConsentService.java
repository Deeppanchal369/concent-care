package com.consentcare.core.service;

import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import com.consentcare.core.workflow.ConsentWorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsentService {

    private static final Set<ConsentCategory> SENSITIVE_CATEGORIES =
            Set.of(ConsentCategory.DIAGNOSES, ConsentCategory.CLINICAL_NOTES, ConsentCategory.RISK_ASSESSMENTS);

    private final ConsentRepository consentRepository;
    private final AccessRequestRepository accessRequestRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PatientDoctorRelationshipRepository relationshipRepository;
    private final ConsentWorkflowService workflowService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Transactional
    public AccessRequestResponse requestAccess(CreateAccessRequest req, User patientUser) {
        Patient patient = patientRepository.findByLinkedUserId(patientUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found"));

        Doctor doctor = doctorRepository.findById(req.doctorId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found with ID: " + req.doctorId()));

        String categoriesStr = req.categories().stream()
                .map(Enum::name)
                .collect(java.util.stream.Collectors.joining(","));

        int durationDays = (req.durationDays() != null && req.durationDays() > 0) ? req.durationDays() : 30;

        AccessRequest accessRequest = AccessRequest.builder()
                .patient(patient)
                .doctor(doctor)
                .requestedBy("PATIENT")
                .status(AccessRequestStatus.PENDING)
                .requestedCategories(categoriesStr)
                .notes(req.notes())
                .durationDays(durationDays)
                .createdAt(OffsetDateTime.now())
                .build();
        accessRequest = accessRequestRepository.save(accessRequest);

        // Notify Doctor
        notificationService.createNotification(
                doctor.getUser().getId(),
                "ACCESS_REQUEST",
                "New Patient Record Sharing Request",
                patient.getFullName() + " requested to share clinical records with you.",
                "AccessRequest",
                accessRequest.getId().toString()
        );

        auditService.logAction(patientUser.getUsername(), Role.PATIENT.name(), "REQUEST_ACCESS", "AccessRequest", accessRequest.getId().toString(), "SUCCESS", "Patient sent access request to doctor " + doctor.getUser().getUsername());

        return toAccessRequestResponse(accessRequest);
    }

    @Transactional
    public ConsentResponse grantConsentDirectly(GrantConsentRequest req, User patientUser) {
        List<ConsentResponse> responses = grantConsentsDirectlyBatch(req, patientUser);
        return responses.isEmpty() ? null : responses.get(0);
    }

    @Transactional
    public List<ConsentResponse> grantConsentsDirectlyBatch(GrantConsentRequest req, User patientUser) {
        Patient patient = patientRepository.findByLinkedUserId(patientUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found"));

        Doctor doctor = doctorRepository.findById(req.doctorId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found: " + req.doctorId()));

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expiresAt = req.expiresAt();
        if (expiresAt == null) {
            if (req.durationHours() != null && req.durationHours() > 0) {
                expiresAt = now.plusHours(req.durationHours());
            } else if (req.durationMinutes() != null && req.durationMinutes() > 0) {
                expiresAt = now.plusMinutes(req.durationMinutes());
            } else {
                expiresAt = now.plusDays(30); // fallback default
            }
        }

        List<ConsentCategory> categoriesToGrant;
        if (req.categories() != null && !req.categories().isEmpty()) {
            categoriesToGrant = req.categories();
        } else if (req.category() != null) {
            categoriesToGrant = List.of(req.category());
        } else {
            categoriesToGrant = List.of(ConsentCategory.MEDICAL_HISTORY);
        }

        List<Consent> savedConsents = new java.util.ArrayList<>();
        for (ConsentCategory cat : categoriesToGrant) {
            Consent consent = Consent.builder()
                    .patientId(patient.getId())
                    .doctorId(doctor.getId())
                    .category(cat)
                    .purpose(req.purpose() != null && !req.purpose().isBlank() ? req.purpose() : "Clinical care consent")
                    .grantedAt(now)
                    .expiresAt(expiresAt)
                    .revoked(false)
                    .status(ConsentStatus.ACTIVE)
                    .grantedBy(patientUser.getUsername())
                    .build();
            savedConsents.add(consentRepository.save(consent));
        }

        // Ensure relationship is established
        if (!relationshipRepository.existsByPatientIdAndDoctorIdAndStatus(patient.getId(), doctor.getId(), "ACTIVE")) {
            relationshipRepository.save(PatientDoctorRelationship.builder()
                    .patient(patient)
                    .doctor(doctor)
                    .status("ACTIVE")
                    .createdAt(now)
                    .build());
        }

        long durationMin = Math.max(1, java.time.Duration.between(now, expiresAt).toMinutes());
        String durationDesc;
        if (durationMin <= 60) {
            durationDesc = durationMin + " minutes";
        } else if (durationMin <= 1440) {
            durationDesc = (durationMin / 60) + " hours";
        } else {
            durationDesc = (durationMin / 1440) + " days";
        }

        String catSummary = categoriesToGrant.size() == 1
                ? categoriesToGrant.get(0).name()
                : categoriesToGrant.size() + " categories (" + categoriesToGrant.stream().map(Enum::name).collect(java.util.stream.Collectors.joining(", ")) + ")";

        notificationService.createNotification(
                doctor.getUser().getId(),
                "CONSENT_GRANTED",
                "New Clinical Consent Granted",
                patient.getFullName() + " granted you " + durationDesc + " access to " + catSummary + ".",
                "Consent",
                savedConsents.get(0).getId().toString()
        );

        auditService.logAction(
                patientUser.getUsername(),
                Role.PATIENT.name(),
                "GRANT_CONSENT",
                "Consent",
                savedConsents.stream().map(c -> c.getId().toString()).collect(java.util.stream.Collectors.joining(",")),
                "SUCCESS",
                "Patient granted consent for " + catSummary + " (duration: " + durationDesc + ", expires: " + expiresAt + ")"
        );

        return savedConsents.stream()
                .map(c -> toConsentResponse(c, patient, doctor))
                .toList();
    }

    @Transactional
    public ConsentResponse revokeConsent(Long consentId, User actor) {
        Consent consent = consentRepository.findById(consentId)
                .orElseThrow(() -> new IllegalArgumentException("Consent record not found: " + consentId));

        Patient patient = patientRepository.findById(consent.getPatientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

        // Only the patient themselves or an admin can revoke consent
        boolean isOwner = patient.getLinkedUserId() != null && patient.getLinkedUserId().equals(actor.getId());
        boolean isAdmin = actor.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("Only the patient can stop sharing their medical records.");
        }

        consent.setRevoked(true);
        consent.setRevokedAt(OffsetDateTime.now());
        consent.setRevokedBy(actor.getUsername());
        consent.setStatus(ConsentStatus.REVOKED);
        consent = consentRepository.save(consent);

        Doctor doctor = doctorRepository.findById(consent.getDoctorId()).orElse(null);
        if (doctor != null) {
            notificationService.createNotification(
                    doctor.getUser().getId(),
                    "CONSENT_REVOKED",
                    "Record Sharing Stopped by Patient",
                    patient.getFullName() + " has stopped sharing " + consent.getCategory() + " with you.",
                    "Consent",
                    consent.getId().toString()
            );
        }

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "REVOKE_CONSENT", "Consent", consentId.toString(), "SUCCESS", "Consent revoked for category " + consent.getCategory());

        return toConsentResponse(consent, patient, doctor);
    }

    @Transactional
    public int revokeDoctorAccess(Long doctorId, User actor) {
        Patient patient;
        if (actor.getRole() == Role.PATIENT) {
            patient = patientRepository.findByLinkedUserId(actor.getId())
                    .orElseThrow(() -> new AccessDeniedException("Patient profile not found for current user"));
        } else {
            throw new AccessDeniedException("Only the patient can stop sharing their medical records.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        List<Consent> activeConsents = consentRepository.findByPatientIdAndDoctorId(patient.getId(), doctorId).stream()
                .filter(c -> !c.isRevoked() && c.getExpiresAt().isAfter(now))
                .toList();

        for (Consent c : activeConsents) {
            c.setRevoked(true);
            c.setRevokedAt(now);
            c.setRevokedBy(actor.getUsername());
            c.setStatus(ConsentStatus.REVOKED);
            consentRepository.save(c);
        }

        Doctor doctor = doctorRepository.findById(doctorId).orElse(null);
        if (doctor != null && !activeConsents.isEmpty()) {
            notificationService.createNotification(
                    doctor.getUser().getId(),
                    "CONSENT_REVOKED",
                    "Record Sharing Stopped by Patient",
                    patient.getFullName() + " has stopped sharing medical records with you.",
                    "Doctor",
                    doctor.getId().toString()
            );
        }

        auditService.logAction(actor.getUsername(), Role.PATIENT.name(), "REVOKE_DOCTOR_ACCESS", "Doctor", doctorId.toString(), "SUCCESS", "Patient revoked all consents for doctor #" + doctorId + " (revoked " + activeConsents.size() + " consents)");

        return activeConsents.size();
    }

    @Transactional
    public int processConsentExpirations() {
        OffsetDateTime now = OffsetDateTime.now();
        int processedCount = 0;

        // 1. Process expired consents
        List<Consent> expired = consentRepository.findActiveExpiredConsents(now, List.of(ConsentStatus.ACTIVE, ConsentStatus.EXPIRING_SOON));
        for (Consent c : expired) {
            c.setStatus(ConsentStatus.EXPIRED);
            consentRepository.save(c);
            processedCount++;

            Patient p = patientRepository.findById(c.getPatientId()).orElse(null);
            Doctor d = doctorRepository.findById(c.getDoctorId()).orElse(null);

            String patientName = p != null ? p.getFullName() : "Patient #" + c.getPatientId();
            String doctorName = d != null ? d.getUser().getFullName() : "Doctor #" + c.getDoctorId();

            // Notify Doctor
            if (d != null && d.getUser() != null) {
                notificationService.createNotification(
                        d.getUser().getId(),
                        "CONSENT_EXPIRED",
                        "Clinical Access Expired",
                        "Your access to " + c.getCategory() + " records for " + patientName + " has expired.",
                        "Consent",
                        c.getId().toString()
                );
            }

            // Notify Patient
            if (p != null && p.getLinkedUserId() != null) {
                notificationService.createNotification(
                        p.getLinkedUserId(),
                        "CONSENT_EXPIRED",
                        "Clinical Consent Expired",
                        "Access to " + c.getCategory() + " for Dr. " + doctorName + " has expired.",
                        "Consent",
                        c.getId().toString()
                );
            }

            auditService.logAction(
                    "SYSTEM",
                    "SYSTEM",
                    "CONSENT_EXPIRED",
                    "Consent",
                    c.getId().toString(),
                    "SUCCESS",
                    "Consent automatically marked EXPIRED at " + c.getExpiresAt()
            );
        }

        // 2. Process expiring soon consents (within 15 minutes)
        OffsetDateTime soonCutoff = now.plusMinutes(15);
        List<Consent> expiringSoon = consentRepository.findActiveExpiringSoonConsents(now, soonCutoff, ConsentStatus.ACTIVE);
        for (Consent c : expiringSoon) {
            c.setStatus(ConsentStatus.EXPIRING_SOON);
            consentRepository.save(c);

            long minutesLeft = Math.max(1, java.time.Duration.between(now, c.getExpiresAt()).toMinutes());
            Patient p = patientRepository.findById(c.getPatientId()).orElse(null);
            Doctor d = doctorRepository.findById(c.getDoctorId()).orElse(null);

            String patientName = p != null ? p.getFullName() : "Patient #" + c.getPatientId();

            if (d != null && d.getUser() != null) {
                notificationService.createNotification(
                        d.getUser().getId(),
                        "CONSENT_EXPIRING",
                        "Clinical Access Expiring Soon",
                        "Access to " + c.getCategory() + " records for " + patientName + " will expire in " + minutesLeft + " minutes.",
                        "Consent",
                        c.getId().toString()
                );
            }
        }

        return processedCount;
    }

    public List<ConsentResponse> listConsentsForPatient(Long patientId, User actor) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + patientId));

        return consentRepository.findByPatientId(patientId).stream()
                .map(c -> {
                    Doctor doc = doctorRepository.findById(c.getDoctorId()).orElse(null);
                    return toConsentResponse(c, patient, doc);
                })
                .toList();
    }

    public List<ConsentResponse> listConsentsForCurrentPatient(User patientUser) {
        Patient patient = patientRepository.findByLinkedUserId(patientUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found for current user"));

        return listConsentsForPatient(patient.getId(), patientUser);
    }

    public List<AccessRequestResponse> listAccessRequestsForPatient(User patientUser) {
        Patient patient = patientRepository.findByLinkedUserId(patientUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found"));

        return accessRequestRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId()).stream()
                .map(this::toAccessRequestResponse)
                .toList();
    }

    public boolean evaluateAccess(Long patientId, Long doctorId, ConsentCategory category, User actor) {
        OffsetDateTime now = OffsetDateTime.now();

        List<Consent> consents = consentRepository.findByPatientIdAndDoctorId(patientId, doctorId);
        boolean allowed = consents.stream()
                .anyMatch(c -> !c.isRevoked() && c.getStatus() != ConsentStatus.EXPIRED && c.getExpiresAt().isAfter(now) &&
                        (c.getCategory() == category || c.getCategory() == ConsentCategory.ENTIRE_RECORD));

        boolean sensitive = SENSITIVE_CATEGORIES.contains(category);
        boolean flagged = sensitive && allowed;

        String decision = allowed ? "ALLOW" : "DENY";
        String reason = allowed ? "Active patient consent verified for " + category : "No active, unrevoked consent covers this role and category";

        auditService.logAccess(patientId, actor, category.name(), decision, reason, flagged);

        return allowed;
    }

    private ConsentResponse toConsentResponse(Consent c, Patient p, Doctor d) {
        ConsentStatus state = workflowService.deriveState(c);
        return new ConsentResponse(
                c.getId(),
                c.getPatientId(),
                p != null ? p.getFullName() : "Patient #" + c.getPatientId(),
                c.getDoctorId(),
                d != null ? d.getUser().getFullName() : "Doctor #" + c.getDoctorId(),
                d != null ? d.getSpecialization() : "Medical Practice",
                c.getCategory(),
                c.getPurpose(),
                c.getGrantedAt(),
                c.getExpiresAt(),
                c.isRevoked(),
                c.getRevokedAt(),
                state,
                c.getGrantedBy(),
                c.getRevokedBy()
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
