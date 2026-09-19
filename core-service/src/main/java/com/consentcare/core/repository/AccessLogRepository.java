package com.consentcare.core.repository;

import com.consentcare.core.model.AccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {
    List<AccessLog> findByPatientIdOrderByAccessedAtDesc(Long patientId);
    List<AccessLog> findByActorUsernameOrderByAccessedAtDesc(String actorUsername);
    Page<AccessLog> findByPatientIdOrderByAccessedAtDesc(Long patientId, Pageable pageable);
}
