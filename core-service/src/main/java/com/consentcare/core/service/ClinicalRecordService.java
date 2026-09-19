package com.consentcare.core.service;

import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.dto.PageResponse;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicalRecordService {

    private final EncounterRepository encounterRepository;
    private final DiagnosisRepository diagnosisRepository;
    private final LabRequestRepository labRequestRepository;
    private final LabReportRepository labReportRepository;
    private final ObservationRepository observationRepository;
    private final DoctorRepository doctorRepository;
    private final NurseRepository nurseRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    // --- ENCOUNTERS ---
    @Transactional
    public EncounterResponse createEncounter(CreateEncounterRequest req, User doctorUser) {
        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only verified doctors can record clinical encounters."));

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + req.patientId()));

        Encounter encounter = Encounter.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .encounterType(req.encounterType())
                .chiefComplaint(req.chiefComplaint())
                .clinicalNotes(req.clinicalNotes())
                .assessmentPlan(req.assessmentPlan())
                .isAmended(false)
                .isArchived(false)
                .encounterDate(OffsetDateTime.now())
                .build();
        encounter = encounterRepository.save(encounter);

        auditService.logAction(doctorUser.getUsername(), doctorUser.getRole().name(), "CREATE_ENCOUNTER",
                "Encounter", encounter.getId().toString(), "SUCCESS", "Recorded encounter for patient " + patient.getId());
        auditService.logAccess(patient.getId(), doctorUser, "MEDICAL_HISTORY", "ALLOW", "Recorded encounter: " + encounter.getChiefComplaint(), false);

        return toEncounterResponse(encounter, doctor.getUser().getFullName());
    }

    @Transactional
    public EncounterResponse amendEncounter(Long encounterId, AmendEncounterRequest req, User doctorUser) {
        Encounter enc = encounterRepository.findById(encounterId)
                .orElseThrow(() -> new IllegalArgumentException("Encounter not found: " + encounterId));

        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only verified doctors can amend clinical encounters."));

        enc.setAmended(true);
        enc.setAmendmentNotes(req.amendmentNotes().trim());
        enc.setAmendedAt(OffsetDateTime.now());
        enc.setAmendedBy(doctorUser.getId());
        enc = encounterRepository.save(enc);

        auditService.logAction(doctorUser.getUsername(), doctorUser.getRole().name(), "AMEND_ENCOUNTER",
                "Encounter", enc.getId().toString(), "SUCCESS", "Amended clinical encounter note: " + req.amendmentNotes());
        auditService.logAccess(enc.getPatientId(), doctorUser, "MEDICAL_HISTORY", "ALLOW", "Amended clinical encounter: " + req.amendmentNotes(), false);

        String docName = doctor.getUser().getFullName();
        return toEncounterResponse(enc, docName);
    }

    public List<EncounterResponse> listEncounters(Long patientId, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_ENCOUNTERS",
                "Patient", patientId.toString(), "SUCCESS", "Viewed patient encounters");

        return encounterRepository.findByPatientIdOrderByEncounterDateDesc(patientId).stream()
                .filter(enc -> !enc.isArchived())
                .map(enc -> {
                    String docName = doctorRepository.findById(enc.getDoctorId())
                            .map(d -> d.getUser().getFullName()).orElse("Doctor #" + enc.getDoctorId());
                    return toEncounterResponse(enc, docName);
                })
                .toList();
    }

    public PageResponse<EncounterResponse> listEncountersPaged(Long patientId, Pageable pageable, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_ENCOUNTERS_PAGED",
                "Patient", patientId.toString(), "SUCCESS", "Viewed paginated patient encounters");

        Page<Encounter> page = encounterRepository.findByPatientIdAndIsArchivedFalseOrderByEncounterDateDesc(patientId, pageable);
        List<EncounterResponse> content = page.getContent().stream()
                .map(enc -> {
                    String docName = doctorRepository.findById(enc.getDoctorId())
                            .map(d -> d.getUser().getFullName()).orElse("Doctor #" + enc.getDoctorId());
                    return toEncounterResponse(enc, docName);
                })
                .toList();

        return PageResponse.from(page, content);
    }

    // --- DIAGNOSES ---
    @Transactional
    public DiagnosisResponse addDiagnosis(CreateDiagnosisRequest req, User doctorUser) {
        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only verified doctors can record diagnoses."));

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + req.patientId()));

        Diagnosis diagnosis = Diagnosis.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .encounterId(req.encounterId())
                .code(req.code())
                .description(req.description().trim())
                .severity(req.severity() != null ? req.severity() : "MODERATE")
                .status("ACTIVE")
                .notes(req.notes())
                .isArchived(false)
                .diagnosedDate(OffsetDateTime.now())
                .build();
        diagnosis = diagnosisRepository.save(diagnosis);

        auditService.logAction(doctorUser.getUsername(), doctorUser.getRole().name(), "ADD_DIAGNOSIS",
                "Diagnosis", diagnosis.getId().toString(), "SUCCESS", "Recorded diagnosis " + diagnosis.getDescription() + " for patient " + patient.getId());
        auditService.logAccess(patient.getId(), doctorUser, "DIAGNOSES", "ALLOW", "Recorded diagnosis: " + diagnosis.getDescription(), false);

        return toDiagnosisResponse(diagnosis, doctor.getUser().getFullName());
    }

    @Transactional
    public DiagnosisResponse updateDiagnosisStatus(Long diagnosisId, UpdateDiagnosisStatusRequest req, User doctorUser) {
        Diagnosis diag = diagnosisRepository.findById(diagnosisId)
                .orElseThrow(() -> new IllegalArgumentException("Diagnosis not found: " + diagnosisId));

        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only verified doctors can update diagnosis status."));

        diag.setStatus(req.status().trim().toUpperCase());
        if (req.notes() != null && !req.notes().isBlank()) {
            diag.setNotes(req.notes().trim());
        }
        diag = diagnosisRepository.save(diag);

        auditService.logAction(doctorUser.getUsername(), doctorUser.getRole().name(), "UPDATE_DIAGNOSIS_STATUS",
                "Diagnosis", diag.getId().toString(), "SUCCESS", "Updated diagnosis status to " + diag.getStatus());
        auditService.logAccess(diag.getPatientId(), doctorUser, "DIAGNOSES", "ALLOW", "Updated diagnosis status: " + diag.getStatus(), false);

        String docName = doctor.getUser().getFullName();
        return toDiagnosisResponse(diag, docName);
    }

    public List<DiagnosisResponse> listDiagnoses(Long patientId, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_DIAGNOSES",
                "Patient", patientId.toString(), "SUCCESS", "Viewed patient diagnoses");

        return diagnosisRepository.findByPatientIdOrderByDiagnosedDateDesc(patientId).stream()
                .filter(d -> !d.isArchived())
                .map(diag -> {
                    String docName = doctorRepository.findById(diag.getDoctorId())
                            .map(d -> d.getUser().getFullName()).orElse("Doctor #" + diag.getDoctorId());
                    return toDiagnosisResponse(diag, docName);
                })
                .toList();
    }

    public PageResponse<DiagnosisResponse> listDiagnosesPaged(Long patientId, Pageable pageable, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_DIAGNOSES_PAGED",
                "Patient", patientId.toString(), "SUCCESS", "Viewed paginated patient diagnoses");

        Page<Diagnosis> page = diagnosisRepository.findByPatientIdAndIsArchivedFalseOrderByDiagnosedDateDesc(patientId, pageable);
        List<DiagnosisResponse> content = page.getContent().stream()
                .map(diag -> {
                    String docName = doctorRepository.findById(diag.getDoctorId())
                            .map(d -> d.getUser().getFullName()).orElse("Doctor #" + diag.getDoctorId());
                    return toDiagnosisResponse(diag, docName);
                })
                .toList();

        return PageResponse.from(page, content);
    }

    // --- LAB REQUESTS ---
    @Transactional
    public LabRequestResponse createLabRequest(CreateLabRequest req, User doctorUser) {
        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only verified doctors can order lab tests."));

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + req.patientId()));

        LabRequest labRequest = LabRequest.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .testName(req.testName().trim())
                .category(req.category() != null ? req.category() : "GENERAL")
                .urgency(req.urgency() != null ? req.urgency() : "ROUTINE")
                .status("ORDERED")
                .instructions(req.instructions())
                .createdAt(OffsetDateTime.now())
                .build();
        labRequest = labRequestRepository.save(labRequest);

        if (patient.getLinkedUserId() != null) {
            notificationService.createNotification(
                    patient.getLinkedUserId(),
                    "LAB_ORDERED",
                    "New Lab Test Ordered",
                    "Dr. " + doctorUser.getFullName() + " ordered a test: " + labRequest.getTestName(),
                    "LabRequest",
                    labRequest.getId().toString()
                    );
        }

        auditService.logAction(doctorUser.getUsername(), doctorUser.getRole().name(), "ORDER_LAB_TEST",
                "LabRequest", labRequest.getId().toString(), "SUCCESS", "Ordered " + labRequest.getTestName());

        return toLabRequestResponse(labRequest, patient.getFullName(), doctorUser.getFullName());
    }

    public List<LabRequestResponse> listLabRequests(Long patientId, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_LAB_REQUESTS",
                "Patient", patientId.toString(), "SUCCESS", "Viewed lab requests");

        Patient patient = patientRepository.findById(patientId).orElse(null);
        String patientName = patient != null ? patient.getFullName() : "Patient #" + patientId;

        return labRequestRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(lr -> {
                    String docName = doctorRepository.findById(lr.getDoctorId())
                            .map(d -> d.getUser().getFullName()).orElse("Doctor #" + lr.getDoctorId());
                    return toLabRequestResponse(lr, patientName, docName);
                })
                .toList();
    }

    @Transactional
    public LabRequestResponse updateLabRequestStatus(Long requestId, String status, User actor) {
        LabRequest lr = labRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Lab request not found: " + requestId));
        lr.setStatus(status);
        labRequestRepository.save(lr);

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "UPDATE_LAB_STATUS",
                "LabRequest", lr.getId().toString(), "SUCCESS", "Status updated to " + status);

        Patient patient = patientRepository.findById(lr.getPatientId()).orElse(null);
        Doctor doctor = doctorRepository.findById(lr.getDoctorId()).orElse(null);

        return toLabRequestResponse(lr,
                patient != null ? patient.getFullName() : "Patient #" + lr.getPatientId(),
                doctor != null ? doctor.getUser().getFullName() : "Doctor #" + lr.getDoctorId());
    }

    // --- LAB REPORTS ---
    @Transactional
    public LabReportResponse recordLabReport(RecordLabReportRequest req, User actor) {
        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + req.patientId()));

        LabReport report = LabReport.builder()
                .patientId(patient.getId())
                .labRequestId(req.labRequestId())
                .documentId(req.documentId())
                .testName(req.testName().trim())
                .resultValue(req.resultValue().trim())
                .unit(req.unit())
                .referenceRange(req.referenceRange())
                .flag(req.flag() != null ? req.flag() : "NORMAL")
                .reportedAt(OffsetDateTime.now())
                .build();
        report = labReportRepository.save(report);

        if (req.labRequestId() != null) {
            labRequestRepository.findById(req.labRequestId()).ifPresent(lr -> {
                lr.setStatus("COMPLETED");
                labRequestRepository.save(lr);
            });
        }

        if (patient.getLinkedUserId() != null) {
            notificationService.createNotification(
                    patient.getLinkedUserId(),
                    "LAB_RESULT_READY",
                    "Lab Result Ready",
                    "Results for " + report.getTestName() + " are now available.",
                    "LabReport",
                    report.getId().toString()
            );
        }

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "RECORD_LAB_REPORT",
                "LabReport", report.getId().toString(), "SUCCESS", "Recorded results for " + report.getTestName());

        return toLabReportResponse(report);
    }

    public List<LabReportResponse> listLabReports(Long patientId, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_LAB_REPORTS",
                "Patient", patientId.toString(), "SUCCESS", "Viewed lab reports");

        return labReportRepository.findByPatientIdOrderByReportedAtDesc(patientId).stream()
                .map(this::toLabReportResponse)
                .toList();
    }

    public PageResponse<LabReportResponse> listLabReportsPaged(Long patientId, Pageable pageable, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_LAB_REPORTS_PAGED",
                "Patient", patientId.toString(), "SUCCESS", "Viewed paginated lab reports");

        Page<LabReport> page = labReportRepository.findByPatientIdOrderByReportedAtDesc(patientId, pageable);
        List<LabReportResponse> content = page.getContent().stream().map(this::toLabReportResponse).toList();
        return PageResponse.from(page, content);
    }

    // --- OBSERVATIONS / VITALS ---
    @Transactional
    public ObservationResponse recordObservation(RecordObservationRequest req, User actor) {
        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + req.patientId()));

        Long doctorId = null;
        Long nurseId = null;
        String doctorName = null;
        String nurseName = null;

        if (actor.getRole() == Role.DOCTOR) {
            Doctor d = doctorRepository.findByUserId(actor.getId()).orElse(null);
            if (d != null) {
                doctorId = d.getId();
                doctorName = actor.getFullName();
            }
        } else if (actor.getRole() == Role.NURSE) {
            Nurse n = nurseRepository.findByUserId(actor.getId()).orElse(null);
            if (n != null) {
                nurseId = n.getId();
                nurseName = actor.getFullName();
            }
        }

        Observation obs = Observation.builder()
                .patientId(patient.getId())
                .doctorId(doctorId)
                .nurseId(nurseId)
                .vitalType(req.vitalType().trim().toUpperCase())
                .valueNumeric(req.valueNumeric())
                .valueText(req.valueText())
                .unit(req.unit().trim())
                .notes(req.notes())
                .observedAt(OffsetDateTime.now())
                .build();
        obs = observationRepository.save(obs);

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "RECORD_VITAL",
                "Observation", obs.getId().toString(), "SUCCESS", "Recorded " + obs.getVitalType() + " = " + obs.getValueNumeric() + " " + obs.getUnit());

        return new ObservationResponse(
                obs.getId(),
                obs.getPatientId(),
                obs.getNurseId(),
                nurseName,
                obs.getDoctorId(),
                doctorName,
                obs.getVitalType(),
                obs.getValueNumeric(),
                obs.getValueText(),
                obs.getUnit(),
                obs.getNotes(),
                obs.getObservedAt()
        );
    }

    public List<ObservationResponse> listObservations(Long patientId, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_VITALS",
                "Patient", patientId.toString(), "SUCCESS", "Viewed patient vitals");

        return observationRepository.findByPatientIdOrderByObservedAtDesc(patientId).stream()
                .map(obs -> {
                    String docName = obs.getDoctorId() != null
                            ? doctorRepository.findById(obs.getDoctorId()).map(d -> d.getUser().getFullName()).orElse(null)
                            : null;
                    String nurseName = obs.getNurseId() != null
                            ? nurseRepository.findById(obs.getNurseId()).map(n -> n.getUser().getFullName()).orElse(null)
                            : null;

                    return new ObservationResponse(
                            obs.getId(),
                            obs.getPatientId(),
                            obs.getNurseId(),
                            nurseName,
                            obs.getDoctorId(),
                            docName,
                            obs.getVitalType(),
                            obs.getValueNumeric(),
                            obs.getValueText(),
                            obs.getUnit(),
                            obs.getNotes(),
                            obs.getObservedAt()
                    );
                })
                .toList();
    }

    private EncounterResponse toEncounterResponse(Encounter enc, String docName) {
        String amendedByName = null;
        if (enc.getAmendedBy() != null) {
            amendedByName = userRepository.findById(enc.getAmendedBy())
                    .map(User::getFullName).orElse(null);
        }
        return new EncounterResponse(
                enc.getId(),
                enc.getPatientId(),
                enc.getDoctorId(),
                docName,
                enc.getEncounterType(),
                enc.getChiefComplaint(),
                enc.getClinicalNotes(),
                enc.getAssessmentPlan(),
                enc.getEncounterDate(),
                enc.isAmended(),
                enc.getAmendmentNotes(),
                enc.getAmendedAt(),
                enc.getAmendedBy(),
                amendedByName,
                enc.isArchived()
        );
    }

    private DiagnosisResponse toDiagnosisResponse(Diagnosis d, String docName) {
        return new DiagnosisResponse(
                d.getId(),
                d.getPatientId(),
                d.getDoctorId(),
                docName,
                d.getEncounterId(),
                d.getCode(),
                d.getDescription(),
                d.getSeverity(),
                d.getStatus() != null ? d.getStatus() : "ACTIVE",
                d.getNotes(),
                d.isArchived(),
                d.getDiagnosedDate()
        );
    }

    private LabRequestResponse toLabRequestResponse(LabRequest lr, String patientName, String docName) {
        return new LabRequestResponse(
                lr.getId(),
                lr.getPatientId(),
                patientName,
                lr.getDoctorId(),
                docName,
                lr.getTestName(),
                lr.getCategory(),
                lr.getUrgency(),
                lr.getStatus(),
                lr.getInstructions(),
                lr.getCreatedAt()
        );
    }

    private LabReportResponse toLabReportResponse(LabReport rep) {
        return new LabReportResponse(
                rep.getId(),
                rep.getLabRequestId(),
                rep.getPatientId(),
                rep.getDocumentId(),
                rep.getTestName(),
                rep.getResultValue(),
                rep.getUnit(),
                rep.getReferenceRange(),
                rep.getFlag(),
                rep.getReportedAt()
        );
    }
}
