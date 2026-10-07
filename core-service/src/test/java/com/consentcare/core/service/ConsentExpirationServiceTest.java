package com.consentcare.core.service;

import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import com.consentcare.core.security.ConsentSecurityEvaluator;
import com.consentcare.core.workflow.ConsentWorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsentExpirationServiceTest {

    @Mock
    private ConsentRepository consentRepository;
    @Mock
    private AccessRequestRepository accessRequestRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private PatientDoctorRelationshipRepository relationshipRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AuditService auditService;
    @Spy
    private ConsentWorkflowService workflowService = new ConsentWorkflowService();

    @InjectMocks
    private ConsentService consentService;

    // Data fixtures
    private User patientUser;
    private User doctorUser1;
    private User doctorUser2;
    private Patient patient;
    private Doctor doctor1;
    private Doctor doctor2;

    @BeforeEach
    void setUp() {
        patientUser = User.builder().id(2L).username("john.patient").role(Role.PATIENT).fullName("John Doe").build();
        doctorUser1 = User.builder().id(3L).username("dr.alice").role(Role.DOCTOR).fullName("Alice Smith").build();
        doctorUser2 = User.builder().id(4L).username("dr.bob").role(Role.DOCTOR).fullName("Bob Jones").build();

        patient = Patient.builder().id(10L).linkedUserId(2L).fullName("John Doe").build();
        doctor1 = Doctor.builder().id(20L).user(doctorUser1).specialization("Internal Medicine").build();
        doctor2 = Doctor.builder().id(30L).user(doctorUser2).specialization("Cardiology").build();
    }

    @Test
    @DisplayName("A & D: Grant 1-hour consent and verify expiry timestamp is persisted")
    void testGrant1HourConsentPersistence() {
        when(patientRepository.findByLinkedUserId(2L)).thenReturn(Optional.of(patient));
        when(doctorRepository.findById(20L)).thenReturn(Optional.of(doctor1));
        when(relationshipRepository.existsByPatientIdAndDoctorIdAndStatus(10L, 20L, "ACTIVE")).thenReturn(true);

        when(consentRepository.save(any(Consent.class))).thenAnswer(invocation -> {
            Consent c = invocation.getArgument(0);
            c.setId(100L);
            return c;
        });

        GrantConsentRequest req = new GrantConsentRequest(
                20L,
                ConsentCategory.MEDICAL_HISTORY,
                List.of(ConsentCategory.MEDICAL_HISTORY, ConsentCategory.LAB_REPORTS),
                "1-Hour Urgent Consult",
                null,
                1, // 1 hour duration
                null
        );

        List<ConsentResponse> responses = consentService.grantConsentsDirectlyBatch(req, patientUser);

        assertNotNull(responses);
        assertEquals(2, responses.size());

        // Verify captured consent has ~1 hour expiry
        ArgumentCaptor<Consent> consentCaptor = ArgumentCaptor.forClass(Consent.class);
        verify(consentRepository, times(2)).save(consentCaptor.capture());

        for (Consent saved : consentCaptor.getAllValues()) {
            assertEquals("john.patient", saved.getGrantedBy());
            assertEquals(ConsentStatus.ACTIVE, saved.getStatus());
            assertFalse(saved.isRevoked());
            assertNotNull(saved.getExpiresAt());
            assertTrue(saved.getExpiresAt().isAfter(OffsetDateTime.now().plusMinutes(58)));
            assertTrue(saved.getExpiresAt().isBefore(OffsetDateTime.now().plusMinutes(62)));
        }

        // Verify notification dispatched with CONSENT_GRANTED type
        verify(notificationService).createNotification(
                eq(3L),
                eq("CONSENT_GRANTED"),
                eq("New Clinical Consent Granted"),
                contains("granted you 60 minutes access"),
                eq("Consent"),
                anyString()
        );

        // Verify audit action logged
        verify(auditService).logAction(
                eq("john.patient"),
                eq("PATIENT"),
                eq("GRANT_CONSENT"),
                eq("Consent"),
                anyString(),
                eq("SUCCESS"),
                contains("duration: 60 minutes")
        );
    }

    @Test
    @DisplayName("B & C: Verify doctor can access permitted information while unauthorized category remains blocked")
    void testDoctorPermittedCategoryAndBlockedCategory() {
        OffsetDateTime oneHourLater = OffsetDateTime.now().plusHours(1);

        Consent activeConsent = Consent.builder()
                .id(101L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.LAB_REPORTS)
                .status(ConsentStatus.ACTIVE)
                .grantedAt(OffsetDateTime.now())
                .expiresAt(oneHourLater)
                .revoked(false)
                .build();

        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(activeConsent));

        // Permitted category: LAB_REPORTS
        boolean allowLab = consentService.evaluateAccess(10L, 20L, ConsentCategory.LAB_REPORTS, doctorUser1);
        assertTrue(allowLab);

        // Blocked category: DIAGNOSES
        boolean allowDiag = consentService.evaluateAccess(10L, 20L, ConsentCategory.DIAGNOSES, doctorUser1);
        assertFalse(allowDiag);

        // Verify audit logging
        verify(auditService).logAccess(eq(10L), eq(doctorUser1), eq("LAB_REPORTS"), eq("ALLOW"), anyString(), eq(false));
        verify(auditService).logAccess(eq(10L), eq(doctorUser1), eq("DIAGNOSES"), eq("DENY"), anyString(), eq(false));
    }

    @Test
    @DisplayName("E & F & K: Simulate expiry using controlled timestamp and verify authorization failure & notifications")
    void testControlledSimulatedExpiryAndStatusTransition() {
        // Controlled expiry: consent created with expiresAt in past (expired 2 minutes ago)
        OffsetDateTime pastExpiry = OffsetDateTime.now().minusMinutes(2);

        Consent expiredConsent = Consent.builder()
                .id(201L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.MEDICAL_HISTORY)
                .status(ConsentStatus.ACTIVE) // not yet transitioned
                .grantedAt(OffsetDateTime.now().minusMinutes(62))
                .expiresAt(pastExpiry)
                .revoked(false)
                .build();

        when(patientRepository.findById(10L)).thenReturn(Optional.of(patient));
        when(doctorRepository.findById(20L)).thenReturn(Optional.of(doctor1));
        when(consentRepository.findActiveExpiredConsents(any(), any())).thenReturn(List.of(expiredConsent));

        // Run background expiration processor
        int processed = consentService.processConsentExpirations();
        assertEquals(1, processed);
        assertEquals(ConsentStatus.EXPIRED, expiredConsent.getStatus());

        // Verify CONSENT_EXPIRED notification sent to Doctor AND Patient
        verify(notificationService).createNotification(
                eq(3L),
                eq("CONSENT_EXPIRED"),
                eq("Clinical Access Expired"),
                contains("records for John Doe has expired"),
                eq("Consent"),
                eq("201")
        );
        verify(notificationService).createNotification(
                eq(2L),
                eq("CONSENT_EXPIRED"),
                eq("Clinical Consent Expired"),
                contains("for Dr. Alice Smith has expired"),
                eq("Consent"),
                eq("201")
        );

        // Verify audit event for expiration
        verify(auditService).logAction(
                eq("SYSTEM"),
                eq("SYSTEM"),
                eq("CONSENT_EXPIRED"),
                eq("Consent"),
                eq("201"),
                eq("SUCCESS"),
                contains("marked EXPIRED")
        );

        // Verify evaluateAccess now immediately DENIES access
        when(consentRepository.findByPatientIdAndDoctorId(10L, 20L)).thenReturn(List.of(expiredConsent));
        boolean accessResult = consentService.evaluateAccess(10L, 20L, ConsentCategory.MEDICAL_HISTORY, doctorUser1);
        assertFalse(accessResult);
    }

    @Test
    @DisplayName("G: Verify patient can grant access again to the same doctor after expiry")
    void testGrantAccessAgainAfterExpiry() {
        when(patientRepository.findByLinkedUserId(2L)).thenReturn(Optional.of(patient));
        when(doctorRepository.findById(20L)).thenReturn(Optional.of(doctor1));
        when(relationshipRepository.existsByPatientIdAndDoctorIdAndStatus(10L, 20L, "ACTIVE")).thenReturn(true);

        when(consentRepository.save(any(Consent.class))).thenAnswer(invocation -> {
            Consent c = invocation.getArgument(0);
            c.setId(301L);
            return c;
        });

        // Grant 1 hour again
        GrantConsentRequest renewReq = new GrantConsentRequest(
                20L,
                ConsentCategory.MEDICAL_HISTORY,
                null,
                "Follow-up consult",
                null,
                1,
                null
        );

        ConsentResponse renewed = consentService.grantConsentDirectly(renewReq, patientUser);
        assertNotNull(renewed);
        assertEquals(ConsentStatus.ACTIVE, renewed.status());
        assertEquals("john.patient", renewed.grantedBy());
        assertTrue(renewed.expiresAt().isAfter(OffsetDateTime.now()));
    }

    @Test
    @DisplayName("H: Verify manual revoke still works and sets revoked_by")
    void testManualRevokeWorksWithAttribution() {
        Consent activeConsent = Consent.builder()
                .id(401L)
                .patientId(10L)
                .doctorId(20L)
                .category(ConsentCategory.MEDICAL_HISTORY)
                .status(ConsentStatus.ACTIVE)
                .grantedAt(OffsetDateTime.now().minusMinutes(10))
                .expiresAt(OffsetDateTime.now().plusMinutes(50))
                .revoked(false)
                .build();

        when(consentRepository.findById(401L)).thenReturn(Optional.of(activeConsent));
        when(patientRepository.findById(10L)).thenReturn(Optional.of(patient));
        when(doctorRepository.findById(20L)).thenReturn(Optional.of(doctor1));
        when(consentRepository.save(any(Consent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ConsentResponse response = consentService.revokeConsent(401L, patientUser);

        assertTrue(response.revoked());
        assertEquals(ConsentStatus.REVOKED, response.status());
        assertEquals("john.patient", response.revokedBy());
        assertNotNull(response.revokedAt());

        // Verify CONSENT_REVOKED notification dispatched
        verify(notificationService).createNotification(
                eq(3L),
                eq("CONSENT_REVOKED"),
                eq("Record Sharing Stopped by Patient"),
                contains("stopped sharing MEDICAL_HISTORY"),
                eq("Consent"),
                eq("401")
        );

        // Verify audit action logged
        verify(auditService).logAction(
                eq("john.patient"),
                eq("PATIENT"),
                eq("REVOKE_CONSENT"),
                eq("Consent"),
                eq("401"),
                eq("SUCCESS"),
                contains("Consent revoked for category MEDICAL_HISTORY")
        );
    }

    @Test
    @DisplayName("I: Verify another doctor without consent remains strictly blocked")
    void testUnauthorizedDoctorBlocked() {
        // Doctor 2 has no consent from patient 10
        when(consentRepository.findByPatientIdAndDoctorId(10L, 30L)).thenReturn(List.of());

        boolean allowed = consentService.evaluateAccess(10L, 30L, ConsentCategory.MEDICAL_HISTORY, doctorUser2);
        assertFalse(allowed);

        verify(auditService).logAccess(
                eq(10L),
                eq(doctorUser2),
                eq("MEDICAL_HISTORY"),
                eq("DENY"),
                contains("No active, unrevoked consent covers this role and category"),
                eq(false)
        );
    }
}

