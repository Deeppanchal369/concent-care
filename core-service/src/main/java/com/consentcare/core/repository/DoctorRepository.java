package com.consentcare.core.repository;

import com.consentcare.core.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    Optional<Doctor> findByUserId(Long userId);
    Optional<Doctor> findByLicenseNumber(String licenseNumber);

    @Query("SELECT d FROM Doctor d WHERE " +
           "LOWER(d.user.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.specialization) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.contactNumber) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Doctor> searchDoctors(@Param("query") String query);

    @Query("SELECT d FROM Doctor d WHERE " +
           "(:query IS NULL OR :query = '' OR " +
           " LOWER(d.user.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(d.specialization) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(COALESCE(d.department.name, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(COALESCE(d.contactNumber, '')) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Doctor> searchDoctorsPaged(@Param("query") String query, Pageable pageable);
}

