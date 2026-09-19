package com.consentcare.core.dto;

import com.consentcare.core.model.AccessRequestStatus;
import com.consentcare.core.model.AvailabilityStatus;
import com.consentcare.core.model.ConsentCategory;
import com.consentcare.core.model.ConsentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public class CareDtos {

    // Patient
    public record PatientResponse(
            Long id,
            Long linkedUserId,
            String fullName,
            LocalDate dateOfBirth,
            String gender,
            String phone,
            String email,
            String address,
            String emergencyContact,
            String bloodGroup,
            String allergies,
            String chronicConditions,
            String medicalHistorySummary,
            OffsetDateTime createdAt
    ) {}

    // Access Request
    public record CreateAccessRequest(
            @NotNull Long doctorId,
            @NotEmpty List<ConsentCategory> categories,
            String notes,
            Integer durationDays
    ) {}

    public record AccessCheckRequest(@NotNull Long patientId, @NotBlank String category) {}
    public record AccessCheckResponse(String decision, String reason, boolean flaggedAsAnomaly) {}
    public record AccessRequestResponse(
            Long id,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            String doctorSpecialization,
            String requestedBy,
            AccessRequestStatus status,
            List<ConsentCategory> requestedCategories,
            String notes,
            Integer durationDays,
            Long reviewedById,
            String reviewedByName,
            OffsetDateTime createdAt,
            OffsetDateTime respondedAt
    ) {}

    public record RespondAccessRequest(
            @NotNull AccessRequestStatus status, // APPROVED or REJECTED
            Integer durationDays // Optional days of validity, default 30
    ) {}

    // Consent
    public record GrantConsentRequest(
            @NotNull Long doctorId,
            @NotNull ConsentCategory category,
            @NotBlank String purpose,
            @NotNull OffsetDateTime expiresAt
    ) {}

    public record ConsentResponse(
            Long id,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            String doctorSpecialization,
            ConsentCategory category,
            String purpose,
            OffsetDateTime grantedAt,
            OffsetDateTime expiresAt,
            boolean revoked,
            OffsetDateTime revokedAt,
            ConsentStatus status
    ) {}

    // Encounter
    public record CreateEncounterRequest(
            @NotNull Long patientId,
            @NotBlank String encounterType,
            String chiefComplaint,
            String clinicalNotes,
            String assessmentPlan
    ) {}

    public record AmendEncounterRequest(
            @NotBlank String amendmentNotes
    ) {}

    public record EncounterResponse(
            Long id,
            Long patientId,
            Long doctorId,
            String doctorName,
            String encounterType,
            String chiefComplaint,
            String clinicalNotes,
            String assessmentPlan,
            OffsetDateTime encounterDate,
            boolean isAmended,
            String amendmentNotes,
            OffsetDateTime amendedAt,
            Long amendedBy,
            String amendedByName,
            boolean isArchived
    ) {}

    // Diagnosis
    public record CreateDiagnosisRequest(
            @NotNull Long patientId,
            Long encounterId,
            String code,
            @NotBlank String description,
            String severity,
            String notes
    ) {}

    public record UpdateDiagnosisStatusRequest(
            @NotBlank String status,
            String notes
    ) {}

    public record DiagnosisResponse(
            Long id,
            Long patientId,
            Long doctorId,
            String doctorName,
            Long encounterId,
            String code,
            String description,
            String severity,
            String status,
            String notes,
            boolean isArchived,
            OffsetDateTime diagnosedDate
    ) {}

    // Lab Request
    public record CreateLabRequest(
            @NotNull Long patientId,
            @NotBlank String testName,
            String category,
            String urgency,
            String instructions
    ) {}

    public record LabRequestResponse(
            Long id,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            String testName,
            String category,
            String urgency,
            String status,
            String instructions,
            OffsetDateTime createdAt
    ) {}

    public record RecordLabReportRequest(
            Long labRequestId,
            @NotNull Long patientId,
            Long documentId,
            @NotBlank String testName,
            @NotBlank String resultValue,
            String unit,
            String referenceRange,
            String flag
    ) {}

    public record LabReportResponse(
            Long id,
            Long labRequestId,
            Long patientId,
            Long documentId,
            String testName,
            String resultValue,
            String unit,
            String referenceRange,
            String flag,
            OffsetDateTime reportedAt
    ) {}

    // Observation (Vitals)
    public record RecordObservationRequest(
            @NotNull Long patientId,
            @NotBlank String vitalType,
            @NotNull BigDecimal valueNumeric,
            String valueText,
            @NotBlank String unit,
            String notes
    ) {}

    public record ObservationResponse(
            Long id,
            Long patientId,
            Long nurseId,
            String nurseName,
            Long doctorId,
            String doctorName,
            String vitalType,
            BigDecimal valueNumeric,
            String valueText,
            String unit,
            String notes,
            OffsetDateTime observedAt
    ) {}

    // Prescriptions
    public record PrescriptionItemInput(
            @NotBlank String medicationName,
            @NotBlank String dosage,
            @NotBlank String frequency,
            int durationDays,
            String instructions
    ) {}

    public record CreatePrescriptionRequest(
            @NotNull Long patientId,
            Long encounterId,
            String notes,
            @NotEmpty List<PrescriptionItemInput> items
    ) {}

    public record PrescriptionItemResponse(
            Long id,
            Long prescriptionId,
            String medicationName,
            String dosage,
            String frequency,
            int durationDays,
            String instructions,
            LocalDate startDate,
            LocalDate endDate,
            boolean active
    ) {}

    public record PrescriptionResponse(
            Long id,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            Long encounterId,
            String status,
            String notes,
            OffsetDateTime createdAt,
            List<PrescriptionItemResponse> items
    ) {}

    public record RecordAdministrationRequest(
            @NotNull Long prescriptionItemId,
            String status, // GIVEN, REFUSED, HELD
            String notes
    ) {}

    // Nurse Workflow
    public record CreateNurseTaskRequest(
            @NotNull Long doctorId,
            @NotNull Long nurseId,
            @NotNull Long patientId,
            @NotBlank String taskType,
            String priority,
            @NotBlank String instructions,
            OffsetDateTime dueTime
    ) {}

    public record NurseTaskResponse(
            Long id,
            Long doctorId,
            String doctorName,
            Long nurseId,
            String nurseName,
            Long patientId,
            String patientName,
            Integer patientAge,
            String patientGender,
            String bloodGroup,
            String allergies,
            String emergencyContact,
            String taskType,
            String priority,
            String instructions,
            String status,
            OffsetDateTime dueTime,
            OffsetDateTime acceptedAt,
            OffsetDateTime startedAt,
            OffsetDateTime completedAt,
            String completionNotes,
            OffsetDateTime cancelledAt,
            String cancellationReason,
            OffsetDateTime createdAt
    ) {}

    public record UpdateNurseTaskStatusRequest(
            @NotBlank String status, // ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED
            String notes
    ) {}

    public record NurseAvailabilityResponse(
            Long nurseId,
            String nurseName,
            AvailabilityStatus status,
            List<NurseTaskResponse> activeTasks
    ) {}

    // Notifications
    public record NotificationResponse(
            Long id,
            Long recipientUserId,
            String type,
            String title,
            String message,
            String referenceType,
            String referenceId,
            boolean readStatus,
            OffsetDateTime createdAt
    ) {}

    // Audit Log
    public record AuditLogResponse(
            Long id,
            String actorUsername,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            String result,
            String metadataJson,
            OffsetDateTime timestamp
    ) {}

    // Patient Activity Record
    public record PatientActivityResponse(
            Long id,
            String actorUsername,
            String actorRole,
            String category,
            String decision,
            String reason,
            boolean flagged,
            OffsetDateTime accessedAt
    ) {}
}
