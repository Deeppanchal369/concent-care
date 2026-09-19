package com.consentcare.core.service;

import com.consentcare.core.model.AccessLog;
import com.consentcare.core.model.AuditLog;
import com.consentcare.core.model.User;
import com.consentcare.core.repository.AccessLogRepository;
import com.consentcare.core.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final AccessLogRepository accessLogRepository;

    public void logAction(String actorUsername, String actorRole, String action, String resourceType, String resourceId, String result, String metadataJson) {
        try {
            AuditLog entry = AuditLog.builder()
                    .actorUsername(actorUsername)
                    .actorRole(actorRole)
                    .action(action)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .result(result)
                    .metadataJson(metadataJson)
                    .timestamp(OffsetDateTime.now())
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log for action: {}", action, e);
        }
    }

    public void logAccess(Long patientId, User actor, String category, String decision, String reason, boolean flagged) {
        try {
            AccessLog logEntry = AccessLog.builder()
                    .patientId(patientId)
                    .actorUsername(actor.getUsername())
                    .actorRole(actor.getRole().name())
                    .category(category)
                    .decision(decision)
                    .reason(reason)
                    .flagged(flagged)
                    .accessedAt(OffsetDateTime.now())
                    .build();
            accessLogRepository.save(logEntry);
        } catch (Exception e) {
            log.error("Failed to write access log for patient: {}", patientId, e);
        }
    }
}

