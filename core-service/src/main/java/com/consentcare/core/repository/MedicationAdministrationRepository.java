package com.consentcare.core.repository;

import com.consentcare.core.model.MedicationAdministration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationAdministrationRepository extends JpaRepository<MedicationAdministration, Long> {
    List<MedicationAdministration> findByPrescriptionItemIdOrderByAdministeredAtDesc(Long prescriptionItemId);
    List<MedicationAdministration> findByNurseIdOrderByAdministeredAtDesc(Long nurseId);
}

