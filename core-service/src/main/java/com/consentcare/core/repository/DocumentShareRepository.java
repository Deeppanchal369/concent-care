package com.consentcare.core.repository;

import com.consentcare.core.model.DocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocumentShareRepository extends JpaRepository<DocumentShare, Long> {
    List<DocumentShare> findByDoctorId(Long doctorId);
    List<DocumentShare> findByDocumentId(Long documentId);
    boolean existsByDocumentIdAndDoctorId(Long documentId, Long doctorId);
    Optional<DocumentShare> findByDocumentIdAndDoctorId(Long documentId, Long doctorId);
    void deleteByDocumentIdAndDoctorId(Long documentId, Long doctorId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM DocumentShare ds WHERE ds.doctor.id = :doctorId AND ds.document.patientId = :patientId")
    void deleteByDoctorIdAndPatientId(@org.springframework.data.repository.query.Param("doctorId") Long doctorId, @org.springframework.data.repository.query.Param("patientId") Long patientId);
}
