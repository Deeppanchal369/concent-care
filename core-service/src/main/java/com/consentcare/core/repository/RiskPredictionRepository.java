package com.consentcare.core.repository;

import com.consentcare.core.model.RiskPrediction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RiskPredictionRepository extends JpaRepository<RiskPrediction, Long> {
    List<RiskPrediction> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    Optional<RiskPrediction> findFirstByPatientIdOrderByCreatedAtDesc(Long patientId);
}

