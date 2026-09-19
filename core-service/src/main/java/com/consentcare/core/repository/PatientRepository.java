package com.consentcare.core.repository;

import com.consentcare.core.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByLinkedUserId(Long linkedUserId);

    @Query("SELECT p FROM Patient p WHERE " +
           "LOWER(p.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(COALESCE(p.phone, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(COALESCE(p.email, '')) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Patient> searchPatients(@Param("query") String query);

    Page<Patient> findByIdIn(List<Long> ids, Pageable pageable);
    Page<Patient> findByIdInAndFullNameContainingIgnoreCase(List<Long> ids, String fullName, Pageable pageable);
}
