package com.consentcare.core.repository;

import com.consentcare.core.model.AccessRequest;
import com.consentcare.core.model.AccessRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccessRequestRepository extends JpaRepository<AccessRequest, Long> {
    List<AccessRequest> findByDoctorIdAndStatusOrderByCreatedAtDesc(Long doctorId, AccessRequestStatus status);
    List<AccessRequest> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<AccessRequest> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
}

