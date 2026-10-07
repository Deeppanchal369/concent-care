package com.consentcare.core.repository;

import com.consentcare.core.model.ClinicalIntelligenceRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClinicalIntelligenceRunRepository extends JpaRepository<ClinicalIntelligenceRun, Long> {
    List<ClinicalIntelligenceRun> findByPatientIdOrderByGeneratedAtDesc(Long patientId);
    Optional<ClinicalIntelligenceRun> findFirstByPatientIdOrderByGeneratedAtDesc(Long patientId);
}

