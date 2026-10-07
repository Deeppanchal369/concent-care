package com.consentcare.core.service;

import com.consentcare.core.dto.FactDtos.*;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import com.consentcare.core.security.ConsentSecurityEvaluator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClinicalFactNormalizationServiceTest {

    @Mock private DocumentExtractedFactRepository factRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private DocumentShareRepository documentShareRepository;
    @Mock private AiDocumentAnalysisRepository aiAnalysisRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private UserRepository userRepository;
    @Mock private EncounterRepository encounterRepository;
    @Mock private DiagnosisRepository diagnosisRepository;
    @Mock private PrescriptionRepository prescriptionRepository;
    @Mock private PrescriptionItemRepository prescriptionItemRepository;
    @Mock private LabReportRepository labReportRepository;
    @Mock private AuditService auditService;
    @Mock private ConsentSecurityEvaluator securityEvaluator;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ClinicalFactNormalizationService normalizationService;

    private User patientUser;
    private Document doc;
    private AiDocumentAnalysis analysis;

    @BeforeEach
    void setUp() {
        normalizationService = new ClinicalFactNormalizationService(
                factRepository,
                documentRepository,
                documentShareRepository,
                aiAnalysisRepository,
                patientRepository,
                doctorRepository,
                userRepository,
                encounterRepository,
                diagnosisRepository,
                prescriptionRepository,
                prescriptionItemRepository,
                labReportRepository,
                auditService,
                securityEvaluator,
                objectMapper
        );

        patientUser = User.builder()
                .id(10L)
                .username("patient_john")
                .fullName("John Doe")
                .role(Role.PATIENT)
                .build();

        doc = Document.builder()
                .id(100L)
                .patientId(34L)
                .fileName("clinical_summary.pdf")
                .originalFilename("clinical_summary.pdf")
                .category(DocumentCategory.PREVIOUS_CONSULTATION)
                .title("Annual Health Checkup")
                .build();

        String structuredJson = """
                {
                    "documentType": "Annual Health Checkup",
                    "summary": "Patient evaluated for routine health check. Blood pressure mildly elevated. Diagnosed with Type 2 Diabetes.",
                    "diagnosesMentioned": ["Type 2 Diabetes mellitus", "Essential hypertension"],
                    "medications": ["Metformin 500mg PO BID", "Lisinopril 10mg once daily"],
                    "labResults": [
                        {"testName": "HbA1c", "resultValue": "7.2", "unit": "%", "flag": "HIGH", "referenceRange": "4.0-5.6"},
                        {"testName": "Fasting Blood Glucose", "resultValue": "138", "unit": "mg/dL", "flag": "HIGH", "referenceRange": "70-99"}
                    ]
                }
                """;

        analysis = AiDocumentAnalysis.builder()
                .id(200L)
                .documentId(100L)
                .patientId(34L)
                .reportType("Clinical Note")
                .summaryText("Patient evaluated for routine checkup.")
                .structuredResultJson(structuredJson)
                .status("READY")
                .build();
    }

    @Test
    void testCreateCandidateFactsFromAnalysis() {
        when(factRepository.existsByDocumentId(100L)).thenReturn(false);
        when(factRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<DocumentExtractedFact> facts = normalizationService.createCandidateFactsFromAnalysis(doc, analysis);

        assertNotNull(facts);
        // Expecting: 1 Encounter + 2 Diagnoses + 2 Medications + 2 Lab Reports = 7 facts
        assertEquals(7, facts.size());

        assertTrue(facts.stream().anyMatch(f -> f.getFactType() == FactType.ENCOUNTER));
        assertEquals(2, facts.stream().filter(f -> f.getFactType() == FactType.DIAGNOSIS).count());
        assertEquals(2, facts.stream().filter(f -> f.getFactType() == FactType.MEDICATION).count());
        assertEquals(2, facts.stream().filter(f -> f.getFactType() == FactType.LAB_REPORT).count());

        for (DocumentExtractedFact f : facts) {
            assertEquals(FactStatus.PENDING, f.getStatus(), "Initial status must be PENDING review");
            assertEquals(100L, f.getDocumentId());
            assertEquals(34L, f.getPatientId());
        }
    }

    @Test
    void testConfirmDiagnosisFactWithDeduplication() {
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(securityEvaluator.isOwningPatient(authentication, 34L)).thenReturn(true);
        when(documentRepository.findById(100L)).thenReturn(Optional.of(doc));

        DocumentExtractedFact fact = DocumentExtractedFact.builder()
                .id(1L)
                .documentId(100L)
                .patientId(34L)
                .factType(FactType.DIAGNOSIS)
                .fieldName("Type 2 Diabetes mellitus")
                .extractedDataJson("{\"description\":\"Type 2 Diabetes mellitus\",\"code\":\"E11.9\",\"severity\":\"MODERATE\"}")
                .status(FactStatus.PENDING)
                .confidenceLevel("STANDARD")
                .build();

        when(factRepository.findById(1L)).thenReturn(Optional.of(fact));

        // Case 1: Diagnosis does not exist yet -> should create new canonical Diagnosis
        when(diagnosisRepository.findByPatientIdOrderByDiagnosedDateDesc(34L)).thenReturn(List.of());
        when(diagnosisRepository.save(any(Diagnosis.class))).thenAnswer(inv -> {
            Diagnosis d = inv.getArgument(0);
            d.setId(501L);
            return d;
        });

        ConfirmFactsBatchRequest req = new ConfirmFactsBatchRequest(List.of(
                new ConfirmFactDecision(1L, "CONFIRM", null, null)
        ));

        FactConfirmationSummary summary = normalizationService.confirmFacts(100L, req, patientUser);

        assertEquals(1, summary.confirmedCount());
        assertEquals(0, summary.duplicatesSkipped());
        assertEquals(FactStatus.CONFIRMED, fact.getStatus());
        assertEquals("Diagnosis", fact.getCanonicalEntityType());
        assertEquals(501L, fact.getCanonicalEntityId());

        // Verify provenance was saved
        ArgumentCaptor<Diagnosis> captor = ArgumentCaptor.forClass(Diagnosis.class);
        verify(diagnosisRepository).save(captor.capture());
        Diagnosis saved = captor.getValue();
        assertEquals(100L, saved.getSourceDocumentId());
        assertTrue(saved.getProvenanceText().contains("clinical_summary.pdf"));
    }

    @Test
    void testConfirmFactSkipsDuplicateWhenActiveExists() {
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(securityEvaluator.isOwningPatient(authentication, 34L)).thenReturn(true);
        when(documentRepository.findById(100L)).thenReturn(Optional.of(doc));

        DocumentExtractedFact fact = DocumentExtractedFact.builder()
                .id(2L)
                .documentId(100L)
                .patientId(34L)
                .factType(FactType.DIAGNOSIS)
                .fieldName("Type 2 Diabetes mellitus")
                .extractedDataJson("{\"description\":\"Type 2 Diabetes mellitus\",\"code\":\"E11.9\",\"severity\":\"MODERATE\"}")
                .status(FactStatus.PENDING)
                .confidenceLevel("STANDARD")
                .build();

        when(factRepository.findById(2L)).thenReturn(Optional.of(fact));

        // Existing active diagnosis with identical description
        Diagnosis existing = Diagnosis.builder()
                .id(888L)
                .patientId(34L)
                .description("Type 2 Diabetes mellitus")
                .status("ACTIVE")
                .isArchived(false)
                .build();
        when(diagnosisRepository.findByPatientIdOrderByDiagnosedDateDesc(34L)).thenReturn(List.of(existing));

        ConfirmFactsBatchRequest req = new ConfirmFactsBatchRequest(List.of(
                new ConfirmFactDecision(2L, "CONFIRM", null, null)
        ));

        FactConfirmationSummary summary = normalizationService.confirmFacts(100L, req, patientUser);

        assertEquals(0, summary.confirmedCount());
        assertEquals(1, summary.duplicatesSkipped(), "Must detect active duplicate and skip duplicate creation");
        verify(diagnosisRepository, never()).save(any(Diagnosis.class));
        assertEquals(888L, fact.getCanonicalEntityId());
    }

    @Test
    void testRejectCandidateFact() {
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(securityEvaluator.isOwningPatient(authentication, 34L)).thenReturn(true);
        when(documentRepository.findById(100L)).thenReturn(Optional.of(doc));

        DocumentExtractedFact fact = DocumentExtractedFact.builder()
                .id(3L)
                .documentId(100L)
                .patientId(34L)
                .factType(FactType.MEDICATION)
                .fieldName("Aspirin")
                .extractedDataJson("{\"medicationName\":\"Aspirin\",\"dosage\":\"81mg\"}")
                .status(FactStatus.PENDING)
                .confidenceLevel("STANDARD")
                .build();

        when(factRepository.findById(3L)).thenReturn(Optional.of(fact));

        ConfirmFactsBatchRequest req = new ConfirmFactsBatchRequest(List.of(
                new ConfirmFactDecision(3L, "REJECT", null, "Not currently taking this medication")
        ));

        FactConfirmationSummary summary = normalizationService.confirmFacts(100L, req, patientUser);

        assertEquals(1, summary.rejectedCount());
        assertEquals(FactStatus.REJECTED, fact.getStatus());
        assertEquals("Not currently taking this medication", fact.getRejectionReason());
        assertEquals(10L, fact.getReviewedByUserId());
        assertNull(fact.getCanonicalEntityId());
        verifyNoInteractions(prescriptionRepository);
    }
}
