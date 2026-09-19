package com.consentcare.core.repository;

import com.consentcare.core.model.Encounter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EncounterRepository extends JpaRepository<Encounter, Long> {
    List<Encounter> findByPatientIdOrderByEncounterDateDesc(Long patientId);
    List<Encounter> findByDoctorIdOrderByEncounterDateDesc(Long doctorId);
    Page<Encounter> findByPatientIdAndIsArchivedFalseOrderByEncounterDateDesc(Long patientId, Pageable pageable);
    Page<Encounter> findByPatientIdOrderByEncounterDateDesc(Long patientId, Pageable pageable);
}
