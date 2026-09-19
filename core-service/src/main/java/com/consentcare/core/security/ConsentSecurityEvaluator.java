package com.consentcare.core.security;

import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

/**
 * Enforces Object-Level and Attribute-Level Access Control (OWASP ASVS 5.0.0 V4.1, V4.2).
 * Strictly guarantees that clinical data follows least-privilege principles.
 * 
 * Rules enforced:
 * - ADMIN: No blanket access to patient clinical records (Rule 7).
 * - PATIENT: Own records only.
 * - DOCTOR: Active, unrevoked consent matching requested category or ENTIRE_RECORD.
 * - NURSE: Active delegation/care-team assignment under a doctor with active patient consent.
 */
@Component("consentSecurityEvaluator")
@RequiredArgsConstructor
@Slf4j
public class ConsentSecurityEvaluator {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final NurseRepository nurseRepository;
    private final PatientRepository patientRepository;
    private final ConsentRepository consentRepository;
    private final DoctorNurseAssignmentRepository assignmentRepository;

    /**
     * Evaluates whether the authenticated actor is authorized to access a patient's
     * clinical data within a specific consent category (e.g. DIAGNOSES, PRESCRIPTIONS).
     */
    public boolean canAccessPatient(Authentication authentication, Long patientId, String categoryName) {
        if (authentication == null || !authentication.isAuthenticated() || patientId == null) {
            return false;
        }
        if (!(authentication.getPrincipal() instanceof User user)) {
            return false;
        }

        // 1. ADMIN has operational metadata access, but NOT clinical data access (Least Privilege)
        if (user.getRole() == Role.ADMIN) {
            log.warn("Security alert: Admin user '{}' attempted direct clinical access to patient {}", user.getUsername(), patientId);
            return false;
        }

        // 2. Patient accessing own record
        if (user.getRole() == Role.PATIENT) {
            return patientRepository.findByLinkedUserId(user.getId())
                    .map(p -> p.getId().equals(patientId))
                    .orElse(false);
        }

        // 3. Doctor accessing patient with active consent for the specific category or ENTIRE_RECORD
        if (user.getRole() == Role.DOCTOR) {
            Doctor doctor = doctorRepository.findByUserId(user.getId()).orElse(null);
            if (doctor == null) return false;

            ConsentCategory requestedCategory;
            try {
                requestedCategory = ConsentCategory.valueOf(categoryName.toUpperCase());
            } catch (Exception e) {
                log.warn("Invalid consent category '{}' evaluated for doctor '{}'", categoryName, user.getUsername());
                return false;
            }

            OffsetDateTime now = OffsetDateTime.now();
            return consentRepository.findByPatientIdAndDoctorId(patientId, doctor.getId()).stream()
                    .anyMatch(c -> !c.isRevoked() && c.getExpiresAt().isAfter(now) &&
                            matchesCategory(c.getCategory(), requestedCategory));
        }

        // 4. Nurse accessing patient assigned to their tasks or their doctor's active care team
        if (user.getRole() == Role.NURSE) {
            Nurse nurse = nurseRepository.findByUserId(user.getId()).orElse(null);
            if (nurse == null) return false;

            ConsentCategory requestedCategory;
            try {
                requestedCategory = ConsentCategory.valueOf(categoryName.toUpperCase());
            } catch (Exception e) {
                return false;
            }

            OffsetDateTime now = OffsetDateTime.now();
            return assignmentRepository.findByNurseIdAndActiveTrue(nurse.getId()).stream()
                    .anyMatch(assignment -> {
                        Doctor doctor = assignment.getDoctor();
                        return consentRepository.findByPatientIdAndDoctorId(patientId, doctor.getId()).stream()
                                .anyMatch(c -> !c.isRevoked() && c.getExpiresAt().isAfter(now) &&
                                        matchesCategory(c.getCategory(), requestedCategory));
                    });
        }

        return false;
    }

    public boolean canAccessPatientCategory(Authentication authentication, Long patientId, String categoryName) {
        return canAccessPatient(authentication, patientId, categoryName);
    }

    private boolean matchesCategory(ConsentCategory granted, ConsentCategory requested) {
        if (granted == ConsentCategory.ENTIRE_RECORD) return true;
        if (granted == requested) return true;
        if (granted == ConsentCategory.MEDICAL_HISTORY && (requested == ConsentCategory.CLINICAL_NOTES || requested == ConsentCategory.DIAGNOSES)) return true;
        if (granted == ConsentCategory.CLINICAL_NOTES && requested == ConsentCategory.MEDICAL_HISTORY) return true;
        if (granted == ConsentCategory.PRESCRIPTIONS && requested == ConsentCategory.MEDICATIONS) return true;
        if (granted == ConsentCategory.MEDICATIONS && requested == ConsentCategory.PRESCRIPTIONS) return true;
        if (granted == ConsentCategory.DOCUMENTS && (requested == ConsentCategory.LAB_REPORTS || requested == ConsentCategory.IMAGING_REPORTS)) return true;
        return false;
    }

    /**
     * Evaluates general clinical record access where a specific category is not restricted
     * (e.g. viewing demographics or basic chart summary).
     */
    public boolean canAccessPatientAny(Authentication authentication, Long patientId) {
        if (authentication == null || !authentication.isAuthenticated() || patientId == null) {
            return false;
        }
        if (!(authentication.getPrincipal() instanceof User user)) {
            return false;
        }

        // ADMIN has NO general clinical chart access
        if (user.getRole() == Role.ADMIN) {
            return false;
        }

        if (user.getRole() == Role.PATIENT) {
            return isOwningPatient(authentication, patientId);
        }

        if (user.getRole() == Role.DOCTOR) {
            return isDoctorForPatient(authentication, patientId);
        }

        if (user.getRole() == Role.NURSE) {
            Nurse nurse = nurseRepository.findByUserId(user.getId()).orElse(null);
            if (nurse == null) return false;
            OffsetDateTime now = OffsetDateTime.now();
            return assignmentRepository.findByNurseIdAndActiveTrue(nurse.getId()).stream()
                    .anyMatch(assignment -> consentRepository.findByPatientIdAndDoctorId(patientId, assignment.getDoctor().getId()).stream()
                            .anyMatch(c -> !c.isRevoked() && c.getExpiresAt().isAfter(now)));
        }

        return false;
    }

    public boolean isDoctorForPatient(Authentication authentication, Long patientId) {
        if (authentication == null || !authentication.isAuthenticated() || patientId == null) return false;
        if (!(authentication.getPrincipal() instanceof User user)) return false;
        if (user.getRole() != Role.DOCTOR) return false;

        Doctor doctor = doctorRepository.findByUserId(user.getId()).orElse(null);
        if (doctor == null) return false;

        OffsetDateTime now = OffsetDateTime.now();
        return consentRepository.findByPatientIdAndDoctorId(patientId, doctor.getId()).stream()
                .anyMatch(c -> !c.isRevoked() && c.getExpiresAt().isAfter(now));
    }

    public boolean isOwningPatient(Authentication authentication, Long patientId) {
        if (authentication == null || !authentication.isAuthenticated() || patientId == null) return false;
        if (!(authentication.getPrincipal() instanceof User user)) return false;
        if (user.getRole() != Role.PATIENT) return false;

        return patientRepository.findByLinkedUserId(user.getId())
                .map(p -> p.getId().equals(patientId))
                .orElse(false);
    }
}
