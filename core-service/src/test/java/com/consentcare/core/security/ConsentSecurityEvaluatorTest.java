package com.consentcare.core.security;

import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsentSecurityEvaluatorTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private NurseRepository nurseRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private ConsentRepository consentRepository;
    @Mock
    private DoctorNurseAssignmentRepository assignmentRepository;
    @Mock
    private com.consentcare.core.service.AuditService auditService;

    @InjectMocks
    private ConsentSecurityEvaluator evaluator;

    private User adminUser;
    private User patientUser;
    private User doctorUser;
    private Patient patient;
    private Doctor doctor;

    @BeforeEach
    void setUp() {
        adminUser = User.builder().id(1L).username("admin").role(Role.ADMIN).build();
        patientUser = User.builder().id(2L).username("john.patient").role(Role.PATIENT).build();
        doctorUser = User.builder().id(3L).username("dr.alice").role(Role.DOCTOR).build();

        patient = Patient.builder().id(10L).linkedUserId(2L).fullName("John Doe").build();
        doctor = Doctor.builder().id(20L).user(doctorUser).specialization("Cardiology").licenseNumber("MD-12345").build();
        lenient().when(patientRepository.existsById(anyLong())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return id != null && id.equals(10L);
        });
    }

    @Test
    void testAdminCannotAccessClinicalRecords() {
        Authentication auth = new UsernamePasswordAuthenticationToken(adminUser, null, adminUser.getAuthorities());

        // ASVS 5.0.0 V4.1.1 & Rule 7: Admin must be denied clinical patient access
        assertFalse(evaluator.canAccessPatient(auth, 10L, "DIAGNOSES"));
        assertFalse(evaluator.canAccessPatientAny(auth, 10L));
    }

    @Test
    void testPatientCanAccessOwnRecord() {
        Authentication auth = new UsernamePasswordAuthenticationToken(patientUser, null, patientUser.getAuthorities());
        when(patientRepository.findByLinkedUserId(2L)).thenReturn(Optional.of(patient));

        assertTrue(evaluator.canAccessPatient(auth, 10L, "MEDICAL_HISTORY"));
        assertTrue(evaluator.canAccessPatientAny(auth, 10L));
    }

    @Test
    void testPatientCannotAccessOtherPatientRecord() {
        Authentication auth = new UsernamePasswordAuthenticationToken(patientUser, null, patientUser.getAuthorities());
        when(patientRepository.findByLinkedUserId(2L)).thenReturn(Optional.of(patient));

        // Different patient ID (99L)
        assertFalse(evaluator.canAccessPatient(auth, 99L, "MEDICAL_HISTORY"));
        assertFalse(evaluator.canAccessPatientAny(auth, 99L));
    }

    @Test
    void testDoctorWithCategoricalConsentAllowedOnlyForGrantedCategory() {
        Authentication auth = new UsernamePasswordAuthenticationToken(doctorUser, null, doctorUser.getAuthorities());
        when(doctorRepository.findByUserId(3L)).thenReturn(Optional.of(doctor));

        // Consent granted ONLY for LAB_REPORTS
        Consent consent = Consent.builder()
                .id(1L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.LAB_REPORTS)
                .expiresAt(OffsetDateTime.now().plusDays(30))
                .revoked(false)
                .build();

        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(consent));

        // Allowed for LAB_REPORTS
        assertTrue(evaluator.canAccessPatient(auth, 10L, "LAB_REPORTS"));

        // Denied for DIAGNOSES (not consented)
        assertFalse(evaluator.canAccessPatient(auth, 10L, "DIAGNOSES"));

        // Denied for PRESCRIPTIONS (not consented)
        assertFalse(evaluator.canAccessPatient(auth, 10L, "PRESCRIPTIONS"));
    }

    @Test
    void testDoctorWithEntireRecordConsentAllowedForAllCategories() {
        Authentication auth = new UsernamePasswordAuthenticationToken(doctorUser, null, doctorUser.getAuthorities());
        when(doctorRepository.findByUserId(3L)).thenReturn(Optional.of(doctor));

        Consent consent = Consent.builder()
                .id(2L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.ENTIRE_RECORD)
                .expiresAt(OffsetDateTime.now().plusDays(30))
                .revoked(false)
                .build();

        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(consent));

        assertTrue(evaluator.canAccessPatient(auth, 10L, "DIAGNOSES"));
        assertTrue(evaluator.canAccessPatient(auth, 10L, "PRESCRIPTIONS"));
        assertTrue(evaluator.canAccessPatient(auth, 10L, "DOCUMENTS"));
    }

    @Test
    void testDoctorDeniedIfConsentRevokedOrExpired() {
        Authentication auth = new UsernamePasswordAuthenticationToken(doctorUser, null, doctorUser.getAuthorities());
        when(doctorRepository.findByUserId(3L)).thenReturn(Optional.of(doctor));

        // Revoked consent
        Consent revokedConsent = Consent.builder()
                .id(3L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.ENTIRE_RECORD)
                .expiresAt(OffsetDateTime.now().plusDays(30))
                .revoked(true)
                .build();

        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(revokedConsent));

        assertFalse(evaluator.canAccessPatient(auth, 10L, "DIAGNOSES"));
        assertFalse(evaluator.canAccessPatientAny(auth, 10L));
    }

    @Test
    void testDoctorDeniedIfConsentExpired() {
        Authentication auth = new UsernamePasswordAuthenticationToken(doctorUser, null, doctorUser.getAuthorities());
        when(doctorRepository.findByUserId(3L)).thenReturn(Optional.of(doctor));

        Consent expiredConsent = Consent.builder()
                .id(4L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.ENTIRE_RECORD)
                .expiresAt(OffsetDateTime.now().minusDays(1)) // Expired yesterday
                .revoked(false)
                .build();

        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(expiredConsent));

        assertFalse(evaluator.canAccessPatient(auth, 10L, "LAB_REPORTS"));
        assertFalse(evaluator.canAccessPatientAny(auth, 10L));
    }

    @Test
    void testNurseAllowedUnderDoctorWithActiveConsent() {
        User nurseUser = User.builder().id(4L).username("nurse.bob").role(Role.NURSE).build();
        Nurse nurse = Nurse.builder().id(30L).user(nurseUser).build();
        Authentication auth = new UsernamePasswordAuthenticationToken(nurseUser, null, nurseUser.getAuthorities());

        when(nurseRepository.findByUserId(4L)).thenReturn(Optional.of(nurse));

        DoctorNurseAssignment assignment = DoctorNurseAssignment.builder()
                .id(1L)
                .doctor(doctor)
                .nurse(nurse)
                .active(true)
                .build();

        when(assignmentRepository.findByNurseIdAndActiveTrue(30L)).thenReturn(List.of(assignment));

        Consent activeConsent = Consent.builder()
                .id(5L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.LAB_REPORTS)
                .expiresAt(OffsetDateTime.now().plusDays(30))
                .revoked(false)
                .build();

        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(activeConsent));

        assertTrue(evaluator.canAccessPatient(auth, 10L, "LAB_REPORTS"));
        assertFalse(evaluator.canAccessPatient(auth, 10L, "DIAGNOSES")); // Denied category
    }

    @Test
    void testNurseDeniedIfAssignmentNotActive() {
        User nurseUser = User.builder().id(4L).username("nurse.bob").role(Role.NURSE).build();
        Nurse nurse = Nurse.builder().id(30L).user(nurseUser).build();
        Authentication auth = new UsernamePasswordAuthenticationToken(nurseUser, null, nurseUser.getAuthorities());

        when(nurseRepository.findByUserId(4L)).thenReturn(Optional.of(nurse));
        when(assignmentRepository.findByNurseIdAndActiveTrue(30L)).thenReturn(List.of()); // No active doctor assignment

        assertFalse(evaluator.canAccessPatient(auth, 10L, "LAB_REPORTS"));
    }

    @Test
    void testDoctorAllowedDuring1HourConsentValidity() {
        Authentication auth = new UsernamePasswordAuthenticationToken(doctorUser, null, doctorUser.getAuthorities());
        when(doctorRepository.findByUserId(3L)).thenReturn(Optional.of(doctor));

        Consent oneHourConsent = Consent.builder()
                .id(101L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.MEDICAL_HISTORY)
                .status(ConsentStatus.ACTIVE)
                .grantedAt(OffsetDateTime.now())
                .expiresAt(OffsetDateTime.now().plusHours(1))
                .revoked(false)
                .build();

        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(oneHourConsent));

        assertTrue(evaluator.canAccessPatient(auth, 10L, "MEDICAL_HISTORY"));
        assertTrue(evaluator.isDoctorForPatient(auth, 10L));
    }

    @Test
    void testDoctorDeniedImmediatelyWhen1HourConsentExpires() {
        Authentication auth = new UsernamePasswordAuthenticationToken(doctorUser, null, doctorUser.getAuthorities());
        when(doctorRepository.findByUserId(3L)).thenReturn(Optional.of(doctor));

        // 1-hour consent that was granted 61 minutes ago (expired 1 minute ago)
        OffsetDateTime grantedAt = OffsetDateTime.now().minusMinutes(61);
        OffsetDateTime expiresAt = OffsetDateTime.now().minusMinutes(1);

        Consent expiredOneHourConsent = Consent.builder()
                .id(102L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.MEDICAL_HISTORY)
                .status(ConsentStatus.ACTIVE) // Even if status flag not yet transitioned, time check denies
                .grantedAt(grantedAt)
                .expiresAt(expiresAt)
                .revoked(false)
                .build();

        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(expiredOneHourConsent));

        assertFalse(evaluator.canAccessPatient(auth, 10L, "MEDICAL_HISTORY"));
        assertFalse(evaluator.isDoctorForPatient(auth, 10L));
        // Verify audit access log was written for denial
        verify(auditService, atLeastOnce()).logAccess(eq(10L), eq(doctorUser), anyString(), eq("DENY"), anyString(), eq(false));
    }
}

