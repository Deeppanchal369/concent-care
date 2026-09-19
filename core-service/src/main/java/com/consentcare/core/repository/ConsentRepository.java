package com.consentcare.core.repository;

import com.consentcare.core.model.Consent;
import com.consentcare.core.model.ConsentCategory;
import com.consentcare.core.model.ConsentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsentRepository extends JpaRepository<Consent, Long> {
    List<Consent> findByPatientId(Long patientId);
    List<Consent> findByDoctorId(Long doctorId);
    List<Consent> findByPatientIdAndDoctorId(Long patientId, Long doctorId);
    List<Consent> findByPatientIdAndDoctorIdAndCategory(Long patientId, Long doctorId, ConsentCategory category);
    List<Consent> findByPatientIdAndDoctorIdAndStatus(Long patientId, Long doctorId, ConsentStatus status);
    Optional<Consent> findFirstByPatientIdAndDoctorIdAndCategoryAndRevokedFalse(Long patientId, Long doctorId, ConsentCategory category);
}

