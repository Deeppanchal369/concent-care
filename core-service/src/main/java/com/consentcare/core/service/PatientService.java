package com.consentcare.core.service;

import com.consentcare.core.dto.CareDtos.PatientActivityResponse;
import com.consentcare.core.dto.CareDtos.PatientResponse;
import com.consentcare.core.dto.PageResponse;
import com.consentcare.core.model.AccessLog;
import com.consentcare.core.model.Patient;
import com.consentcare.core.model.Role;
import com.consentcare.core.model.User;
import com.consentcare.core.repository.AccessLogRepository;
import com.consentcare.core.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final AccessLogRepository accessLogRepository;
    private final AuditService auditService;

    public List<PatientResponse> listAll(User actor) {
        if (actor == null || actor.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only administrators can list the entire clinic patient directory.");
        }
        return patientRepository.findAll().stream().map(this::toResponse).toList();
    }

    public PatientResponse getById(Long id, User actor) {
        Patient p = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + id));

        auditService.logAction(actor.getUsername(), actor.getRole().name(), "VIEW_PATIENT_PROFILE", "Patient", id.toString(), "SUCCESS", "Viewed patient summary");
        return toResponse(p);
    }

    public PatientResponse getMine(Long userId) {
        Patient p = patientRepository.findByLinkedUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("No patient profile is linked to this account."));
        return toResponse(p);
    }

    public PageResponse<PatientActivityResponse> getPatientActivityPaged(Long patientId, Pageable pageable, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "VIEW_PATIENT_ACTIVITY", "Patient", patientId.toString(), "SUCCESS", "Viewed patient activity log");
        Page<AccessLog> page = accessLogRepository.findByPatientIdOrderByAccessedAtDesc(patientId, pageable);
        List<PatientActivityResponse> content = page.getContent().stream()
                .map(al -> new PatientActivityResponse(
                        al.getId(),
                        al.getActorUsername(),
                        al.getActorRole(),
                        al.getCategory(),
                        al.getDecision(),
                        al.getReason(),
                        al.isFlagged(),
                        al.getAccessedAt()
                ))
                .toList();
        return PageResponse.from(page, content);
    }

    private PatientResponse toResponse(Patient p) {
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
}
