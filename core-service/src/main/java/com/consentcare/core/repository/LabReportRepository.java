package com.consentcare.core.repository;

import com.consentcare.core.model.LabReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LabReportRepository extends JpaRepository<LabReport, Long> {
    List<LabReport> findByPatientIdOrderByReportedAtDesc(Long patientId);
    List<LabReport> findByLabRequestId(Long labRequestId);
    Page<LabReport> findByPatientIdOrderByReportedAtDesc(Long patientId, Pageable pageable);
}
