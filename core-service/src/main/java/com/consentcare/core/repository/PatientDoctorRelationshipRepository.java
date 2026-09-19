package com.consentcare.core.repository;

import com.consentcare.core.model.PatientDoctorRelationship;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientDoctorRelationshipRepository extends JpaRepository<PatientDoctorRelationship, Long> {
    List<PatientDoctorRelationship> findByDoctorIdAndStatus(Long doctorId, String status);
    List<PatientDoctorRelationship> findByPatientIdAndStatus(Long patientId, String status);
    Optional<PatientDoctorRelationship> findByPatientIdAndDoctorId(Long patientId, Long doctorId);
    boolean existsByPatientIdAndDoctorIdAndStatus(Long patientId, Long doctorId, String status);
}

