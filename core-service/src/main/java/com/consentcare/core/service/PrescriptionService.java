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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository itemRepository;
    private final MedicationAdministrationRepository adminRepository;
    private final DoctorRepository doctorRepository;
    private final NurseRepository nurseRepository;
    private final PatientRepository patientRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Transactional
    public PrescriptionResponse create(CreatePrescriptionRequest req, User doctorUser) {
        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only verified medical doctors can prescribe medication."));

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + req.patientId()));

        Prescription prescription = Prescription.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .encounterId(req.encounterId())
                .status("ACTIVE")
                .notes(req.notes())
                .createdAt(OffsetDateTime.now())
                .build();
        prescription = prescriptionRepository.save(prescription);

        for (PrescriptionItemInput item : req.items()) {
            PrescriptionItem pi = PrescriptionItem.builder()
                    .prescriptionId(prescription.getId())
                    .medicationName(item.medicationName().trim())
                    .dosage(item.dosage().trim())
                    .frequency(item.frequency().trim())
                    .durationDays(item.durationDays() > 0 ? item.durationDays() : 7)
                    .instructions(item.instructions())
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(item.durationDays() > 0 ? item.durationDays() : 7))
                    .active(true)
                    .build();
            itemRepository.save(pi);
        }

        if (patient.getLinkedUserId() != null) {
            notificationService.createNotification(
                    patient.getLinkedUserId(),
                    "NEW_PRESCRIPTION",
                    "New Prescription Issued",
                    "Dr. " + doctorUser.getFullName() + " has issued a new prescription for your care.",
                    "Prescription",
                    prescription.getId().toString()
            );
        }

        auditService.logAction(doctorUser.getUsername(), Role.DOCTOR.name(), "CREATE_PRESCRIPTION", "Prescription", prescription.getId().toString(), "SUCCESS", "Prescription issued for patient " + patient.getId());

        return toResponse(prescription);
    }

    public List<PrescriptionResponse> listForPatient(Long patientId, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_PRESCRIPTIONS", "Patient", patientId.toString(), "SUCCESS", "Listed patient prescriptions");
        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::toResponse)
                .toList();
    }

    public PageResponse<PrescriptionResponse> listForPatientPaged(Long patientId, Pageable pageable, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_PRESCRIPTIONS_PAGED", "Patient", patientId.toString(), "SUCCESS", "Listed paginated patient prescriptions");
        Page<Prescription> page = prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId, pageable);
        List<PrescriptionResponse> content = page.getContent().stream().map(this::toResponse).toList();
        return PageResponse.from(page, content);
    }

    @Transactional
    public void recordAdministration(RecordAdministrationRequest req, User nurseUser) {
        Nurse nurse = nurseRepository.findByUserId(nurseUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only authorized nurses can log medication administration."));

        PrescriptionItem item = itemRepository.findById(req.prescriptionItemId())
                .orElseThrow(() -> new IllegalArgumentException("Prescription item not found: " + req.prescriptionItemId()));

        MedicationAdministration ma = MedicationAdministration.builder()
                .prescriptionItemId(item.getId())
                .nurseId(nurse.getId())
                .administeredAt(OffsetDateTime.now())
                .status(req.status() != null ? req.status() : "GIVEN")
                .notes(req.notes())
                .build();
        adminRepository.save(ma);

        auditService.logAction(nurseUser.getUsername(), Role.NURSE.name(), "MEDICATION_ADMINISTERED", "MedicationAdministration", ma.getId().toString(), "SUCCESS", "Medication " + item.getMedicationName() + " logged as " + ma.getStatus());
    }

    private PrescriptionResponse toResponse(Prescription p) {
        Doctor doctor = doctorRepository.findById(p.getDoctorId()).orElse(null);
        Patient patient = patientRepository.findById(p.getPatientId()).orElse(null);

        List<PrescriptionItemResponse> items = itemRepository.findByPrescriptionId(p.getId()).stream()
                .map(i -> new PrescriptionItemResponse(
                        i.getId(),
                        i.getPrescriptionId(),
                        i.getMedicationName(),
                        i.getDosage(),
                        i.getFrequency(),
                        i.getDurationDays(),
                        i.getInstructions(),
                        i.getStartDate(),
                        i.getEndDate(),
                        i.isActive()
                ))
                .toList();

        return new PrescriptionResponse(
                p.getId(),
                p.getPatientId(),
                patient != null ? patient.getFullName() : "Patient #" + p.getPatientId(),
                p.getDoctorId(),
                doctor != null ? doctor.getUser().getFullName() : "Doctor #" + p.getDoctorId(),
                p.getEncounterId(),
                p.getStatus(),
                p.getNotes(),
                p.getCreatedAt(),
                items
        );
    }
}
