package com.consentcare.core.service;

import com.consentcare.core.dto.AuthDtos.NurseSummary;
import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NurseService {

    private final NurseRepository nurseRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final DoctorNurseAssignmentRepository assignmentRepository;
    private final NurseTaskRepository nurseTaskRepository;
    private final NurseTaskEventRepository taskEventRepository;
    private final ConsentRepository consentRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public List<NurseSummary> listAllNurses() {
        return nurseRepository.findAll().stream()
                .map(this::toNurseSummary)
                .toList();
    }

    public NurseSummary getNurseByUserId(Long userId) {
        Nurse n = nurseRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Nurse profile not found for user: " + userId));
        return toNurseSummary(n);
    }

    public List<NurseTaskResponse> getMyTasks(Long userId) {
        Nurse nurse = nurseRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Nurse profile not found"));

        return nurseTaskRepository.findByNurseIdOrderByCreatedAtDesc(nurse.getId()).stream()
                .map(this::toTaskResponse)
                .toList();
    }

    public List<NurseTaskResponse> getTasksForDoctor(Long userId) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        return nurseTaskRepository.findByDoctorIdOrderByCreatedAtDesc(doctor.getId()).stream()
                .map(this::toTaskResponse)
                .toList();
    }

    @Transactional
    public NurseTaskResponse assignTask(CreateNurseTaskRequest req, User doctorUser) {
        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        if (!doctor.getId().equals(req.doctorId())) {
            throw new AccessDeniedException("Doctor ID mismatch in assignment request.");
        }

        // 1. Transaction-safe concurrency: Pessimistic write lock on Nurse
        Nurse nurse = nurseRepository.findByIdForUpdate(req.nurseId())
                .orElseThrow(() -> new IllegalArgumentException("Nurse not found: " + req.nurseId()));

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + req.patientId()));

        // 2. Doctor MUST have active consent from the patient
        OffsetDateTime now = OffsetDateTime.now();
        boolean hasConsent = consentRepository.findByPatientIdAndDoctorId(patient.getId(), doctor.getId()).stream()
                .anyMatch(c -> !c.isRevoked() && c.getExpiresAt().isAfter(now));
        if (!hasConsent) {
            throw new AccessDeniedException("Doctor #" + doctor.getId() + " does not have active patient consent to order clinical tasks for " + patient.getFullName());
        }

        // 3. Nurse MUST belong to doctor's active care team
        boolean assigned = assignmentRepository.existsByDoctorIdAndNurseIdAndActiveTrue(doctor.getId(), nurse.getId());
        if (!assigned) {
            throw new AccessDeniedException("Nurse " + nurse.getUser().getFullName() + " is not assigned to Dr. " + doctorUser.getFullName() + "'s care team.");
        }

        // 4. Verify nurse availability
        if (nurse.getAvailabilityStatus() != AvailabilityStatus.AVAILABLE) {
            throw new IllegalArgumentException("Nurse " + nurse.getUser().getFullName() + " is currently " + nurse.getAvailabilityStatus() + " with other clinical duties. Please assign to an available nurse or wait until status is reset.");
        }

        // 5. Create task
        NurseTask task = NurseTask.builder()
                .doctor(doctor)
                .nurse(nurse)
                .patient(patient)
                .taskType(req.taskType())
                .priority(req.priority() != null ? req.priority() : "ROUTINE")
                .instructions(req.instructions())
                .status("ASSIGNED")
                .dueTime(req.dueTime())
                .createdAt(now)
                .build();
        task = nurseTaskRepository.save(task);

        // 6. Concurrency transition: AVAILABLE -> BUSY
        nurse.setAvailabilityStatus(AvailabilityStatus.BUSY);
        nurseRepository.save(nurse);

        // 7. Record task event
        taskEventRepository.save(NurseTaskEvent.builder()
                .taskId(task.getId())
                .actorNurseId(nurse.getId())
                .eventType("ASSIGNED")
                .notes("Task assigned by Dr. " + doctorUser.getFullName())
                .timestamp(now)
                .build());

        // 8. Notify nurse
        notificationService.createNotification(
                nurse.getUser().getId(),
                "NURSE_ASSIGNMENT",
                "New Clinical Task Assigned",
                "Dr. " + doctorUser.getFullName() + " assigned you a task for " + patient.getFullName() + ": " + req.taskType(),
                "NurseTask",
                task.getId().toString()
        );

        // 9. Notify patient
        if (patient.getLinkedUserId() != null) {
            notificationService.createNotification(
                    patient.getLinkedUserId(),
                    "DOCTOR_INSTRUCTION",
                    "New Clinical Task Ordered",
                    "Dr. " + doctorUser.getFullName() + " ordered a " + req.taskType().toLowerCase().replace('_', ' ') + " for your care.",
                    "NurseTask",
                    task.getId().toString()
            );
        }

        auditService.logAction(doctorUser.getUsername(), Role.DOCTOR.name(), "ASSIGN_NURSE_TASK", "NurseTask", task.getId().toString(), "SUCCESS", "Assigned task to nurse " + nurse.getUser().getUsername());

        return toTaskResponse(task);
    }

    @Transactional
    public NurseTaskResponse updateTaskStatus(Long taskId, UpdateNurseTaskStatusRequest req, User nurseUser) {
        Nurse nurse = nurseRepository.findByUserIdForUpdate(nurseUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Nurse profile not found"));

        NurseTask task = nurseTaskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));

        if (!task.getNurse().getId().equals(nurse.getId())) {
            throw new AccessDeniedException("You are not assigned to this task.");
        }

        String oldStatus = task.getStatus();
        String newStatus = req.status().toUpperCase();
        OffsetDateTime now = OffsetDateTime.now();

        // Validate allowed state transitions:
        // ASSIGNED -> ACCEPTED, CANCELLED
        // ACCEPTED -> IN_PROGRESS, CANCELLED
        // IN_PROGRESS -> COMPLETED, CANCELLED
        // COMPLETED / CANCELLED -> Terminal states
        if ("COMPLETED".equals(oldStatus) || "CANCELLED".equals(oldStatus)) {
            throw new IllegalStateException("Task #" + taskId + " is already in terminal state: " + oldStatus);
        }
        if ("ACCEPTED".equals(newStatus) && !"ASSIGNED".equals(oldStatus)) {
            throw new IllegalStateException("Cannot accept task from status " + oldStatus);
        }
        if ("IN_PROGRESS".equals(newStatus) && !"ACCEPTED".equals(oldStatus) && !"ASSIGNED".equals(oldStatus)) {
            throw new IllegalStateException("Cannot start task from status " + oldStatus);
        }

        task.setStatus(newStatus);
        if ("ACCEPTED".equals(newStatus)) {
            task.setAcceptedAt(now);
        } else if ("IN_PROGRESS".equals(newStatus)) {
            task.setStartedAt(now);
        } else if ("COMPLETED".equals(newStatus)) {
            task.setCompletedAt(now);
            task.setCompletionNotes(req.notes());
        } else if ("CANCELLED".equals(newStatus)) {
            task.setCancelledAt(now);
            task.setCancellationReason(req.notes());
        }
        task = nurseTaskRepository.save(task);

        String eventType = "IN_PROGRESS".equals(newStatus) ? "STARTED" : newStatus;
        taskEventRepository.save(NurseTaskEvent.builder()
                .taskId(task.getId())
                .actorNurseId(nurse.getId())
                .eventType(eventType)
                .notes(req.notes())
                .timestamp(now)
                .build());

        // Check if nurse has any remaining active tasks
        if ("COMPLETED".equals(newStatus) || "CANCELLED".equals(newStatus)) {
            long remainingActive = nurseTaskRepository.countByNurseIdAndStatusIn(
                    nurse.getId(),
                    List.of("ASSIGNED", "ACCEPTED", "IN_PROGRESS")
            );
            if (remainingActive == 0) {
                nurse.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
                nurseRepository.save(nurse);
                log.info("Nurse {} has 0 active tasks; availability returned to AVAILABLE", nurse.getUser().getUsername());
            }
        }

        // Notifications
        if ("COMPLETED".equals(newStatus)) {
            notificationService.createNotification(
                    task.getDoctor().getUser().getId(),
                    "TASK_COMPLETED",
                    "Task Completed by Nurse",
                    nurse.getUser().getFullName() + " completed task: " + task.getTaskType() + " for " + task.getPatient().getFullName(),
                    "NurseTask",
                    task.getId().toString()
            );

            if (task.getPatient().getLinkedUserId() != null) {
                notificationService.createNotification(
                        task.getPatient().getLinkedUserId(),
                        "TASK_COMPLETED",
                        "Care Task Completed",
                        "Nurse " + nurse.getUser().getFullName() + " completed your " + task.getTaskType().toLowerCase().replace('_', ' '),
                        "NurseTask",
                        task.getId().toString()
                );
            }
        } else if ("ACCEPTED".equals(newStatus)) {
            notificationService.createNotification(
                    task.getDoctor().getUser().getId(),
                    "NURSE_ASSIGNMENT",
                    "Task Accepted by Nurse",
                    nurse.getUser().getFullName() + " accepted task: " + task.getTaskType() + " for " + task.getPatient().getFullName(),
                    "NurseTask",
                    task.getId().toString()
            );
        }

        auditService.logAction(nurseUser.getUsername(), Role.NURSE.name(), "UPDATE_TASK_STATUS", "NurseTask", taskId.toString(), "SUCCESS", "Task status changed from " + oldStatus + " to " + newStatus);

        return toTaskResponse(task);
    }

    @Transactional
    public void setNurseAvailability(Long nurseId, AvailabilityStatus status, User actor) {
        Nurse nurse = nurseRepository.findById(nurseId)
                .orElseThrow(() -> new IllegalArgumentException("Nurse not found: " + nurseId));

        // The nurse themselves or an admin can update availability
        boolean isSelf = nurse.getUser().getId().equals(actor.getId());
        boolean isAdmin = actor.getRole() == Role.ADMIN;
        if (!isSelf && !isAdmin) {
            throw new AccessDeniedException("You can only change your own availability status.");
        }

        nurse.setAvailabilityStatus(status);
        nurseRepository.save(nurse);

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "SET_NURSE_AVAILABILITY", "Nurse", nurseId.toString(), "SUCCESS", "Nurse availability updated to " + status);
    }

    private NurseSummary toNurseSummary(Nurse n) {
        return new NurseSummary(
                n.getId(),
                n.getUser().getId(),
                n.getUser().getFullName(),
                n.getUser().getEmail(),
                n.getDepartment() != null ? n.getDepartment().getName() : "General",
                n.getAvailabilityStatus(),
                n.getContactNumber()
        );
    }

    private NurseTaskResponse toTaskResponse(NurseTask t) {
        Patient p = t.getPatient();
        Integer age = null;
        if (p.getDateOfBirth() != null) {
            age = java.time.Period.between(p.getDateOfBirth(), java.time.LocalDate.now()).getYears();
        }

        return new NurseTaskResponse(
                t.getId(),
                t.getDoctor().getId(),
                t.getDoctor().getUser().getFullName(),
                t.getNurse().getId(),
                t.getNurse().getUser().getFullName(),
                p.getId(),
                p.getFullName(),
                age,
                p.getGender(),
                p.getBloodGroup(),
                p.getAllergies(),
                p.getEmergencyContact(),
                t.getTaskType(),
                t.getPriority(),
                t.getInstructions(),
                t.getStatus(),
                t.getDueTime(),
                t.getAcceptedAt(),
                t.getStartedAt(),
                t.getCompletedAt(),
                t.getCompletionNotes(),
                t.getCancelledAt(),
                t.getCancellationReason(),
                t.getCreatedAt()
        );
    }
}

