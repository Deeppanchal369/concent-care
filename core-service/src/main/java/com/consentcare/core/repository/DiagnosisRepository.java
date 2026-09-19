package com.consentcare.core.repository;

import com.consentcare.core.model.Diagnosis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DiagnosisRepository extends JpaRepository<Diagnosis, Long> {
    List<Diagnosis> findByPatientIdOrderByDiagnosedDateDesc(Long patientId);
    List<Diagnosis> findByDoctorIdOrderByDiagnosedDateDesc(Long doctorId);
    Page<Diagnosis> findByPatientIdAndIsArchivedFalseOrderByDiagnosedDateDesc(Long patientId, Pageable pageable);
    Page<Diagnosis> findByPatientIdOrderByDiagnosedDateDesc(Long patientId, Pageable pageable);
}
