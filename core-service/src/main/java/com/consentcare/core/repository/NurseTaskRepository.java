package com.consentcare.core.repository;

import com.consentcare.core.model.NurseTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NurseTaskRepository extends JpaRepository<NurseTask, Long> {
    List<NurseTask> findByNurseIdOrderByCreatedAtDesc(Long nurseId);
    List<NurseTask> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    List<NurseTask> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<NurseTask> findByNurseIdAndStatus(Long nurseId, String status);
    List<NurseTask> findByNurseIdAndStatusIn(Long nurseId, List<String> statuses);
    long countByNurseIdAndStatusIn(Long nurseId, List<String> statuses);
}

