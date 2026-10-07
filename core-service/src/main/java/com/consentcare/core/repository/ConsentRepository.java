package com.consentcare.core.repository;

import com.consentcare.core.model.Consent;
import com.consentcare.core.model.ConsentCategory;
import com.consentcare.core.model.ConsentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ConsentRepository extends JpaRepository<Consent, Long> {
    List<Consent> findByPatientId(Long patientId);
    List<Consent> findByDoctorId(Long doctorId);
    List<Consent> findByPatientIdAndDoctorId(Long patientId, Long doctorId);
    List<Consent> findByPatientIdAndDoctorIdAndCategory(Long patientId, Long doctorId, ConsentCategory category);
    List<Consent> findByPatientIdAndDoctorIdAndStatus(Long patientId, Long doctorId, ConsentStatus status);
    Optional<Consent> findFirstByPatientIdAndDoctorIdAndCategoryAndRevokedFalse(Long patientId, Long doctorId, ConsentCategory category);

    @Query("SELECT c FROM Consent c WHERE c.revoked = false AND c.status IN :statuses AND c.expiresAt <= :now")
    List<Consent> findActiveExpiredConsents(@Param("now") OffsetDateTime now, @Param("statuses") Collection<ConsentStatus> statuses);

    @Query("SELECT c FROM Consent c WHERE c.revoked = false AND c.status = :status AND c.expiresAt > :now AND c.expiresAt <= :soonCutoff")
    List<Consent> findActiveExpiringSoonConsents(@Param("now") OffsetDateTime now, @Param("soonCutoff") OffsetDateTime soonCutoff, @Param("status") ConsentStatus status);

    long countByStatus(ConsentStatus status);
    long countByRevokedTrue();
}

