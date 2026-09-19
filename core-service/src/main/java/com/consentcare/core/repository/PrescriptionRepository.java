package com.consentcare.core.repository;

import com.consentcare.core.model.Prescription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatientId(Long patientId);
    List<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<Prescription> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<Prescription> findByPatientIdAndStatus(Long patientId, String status);
    Page<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId, Pageable pageable);
}
