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
}
