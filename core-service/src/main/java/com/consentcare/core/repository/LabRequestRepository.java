package com.consentcare.core.repository;

import com.consentcare.core.model.LabRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LabRequestRepository extends JpaRepository<LabRequest, Long> {
    List<LabRequest> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<LabRequest> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<LabRequest> findByStatusOrderByCreatedAtDesc(String status);
}

