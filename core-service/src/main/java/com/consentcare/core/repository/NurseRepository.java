package com.consentcare.core.repository;

import com.consentcare.core.model.AvailabilityStatus;
import com.consentcare.core.model.Nurse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NurseRepository extends JpaRepository<Nurse, Long> {
    Optional<Nurse> findByUserId(Long userId);
    List<Nurse> findByAvailabilityStatus(AvailabilityStatus status);
    List<Nurse> findByDepartmentId(Long departmentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT n FROM Nurse n WHERE n.id = :id")
    Optional<Nurse> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT n FROM Nurse n WHERE n.user.id = :userId")
    Optional<Nurse> findByUserIdForUpdate(@Param("userId") Long userId);
}

