package com.consentcare.core.repository;

import com.consentcare.core.model.Observation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ObservationRepository extends JpaRepository<Observation, Long> {
    List<Observation> findByPatientIdOrderByObservedAtDesc(Long patientId);
    List<Observation> findByPatientIdAndVitalTypeOrderByObservedAtDesc(Long patientId, String vitalType);
}

