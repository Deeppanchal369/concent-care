package com.consentcare.core.repository;

import com.consentcare.core.model.DocumentExtractedFact;
import com.consentcare.core.model.FactStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentExtractedFactRepository extends JpaRepository<DocumentExtractedFact, Long> {

    List<DocumentExtractedFact> findByDocumentIdOrderByCreatedAtAsc(Long documentId);

    List<DocumentExtractedFact> findByPatientIdAndStatusOrderByCreatedAtDesc(Long patientId, FactStatus status);

    List<DocumentExtractedFact> findByDocumentIdAndStatus(Long documentId, FactStatus status);

    boolean existsByDocumentId(Long documentId);

    long countByStatus(FactStatus status);
}

