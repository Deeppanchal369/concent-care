package com.consentcare.core.repository;

import com.consentcare.core.model.DoctorNurseAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorNurseAssignmentRepository extends JpaRepository<DoctorNurseAssignment, Long> {
    List<DoctorNurseAssignment> findByDoctorIdAndActiveTrue(Long doctorId);
    List<DoctorNurseAssignment> findByNurseIdAndActiveTrue(Long nurseId);
    Optional<DoctorNurseAssignment> findByDoctorIdAndNurseId(Long doctorId, Long nurseId);
    boolean existsByDoctorIdAndNurseIdAndActiveTrue(Long doctorId, Long nurseId);
}

