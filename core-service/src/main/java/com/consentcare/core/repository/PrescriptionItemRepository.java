package com.consentcare.core.repository;

import com.consentcare.core.model.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, Long> {
    List<PrescriptionItem> findByPrescriptionId(Long prescriptionId);
    List<PrescriptionItem> findByPrescriptionIdAndActiveTrue(Long prescriptionId);
}

