package com.consentcare.core.repository;

import com.consentcare.core.model.AiDocumentAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AiDocumentAnalysisRepository extends JpaRepository<AiDocumentAnalysis, Long> {
    Optional<AiDocumentAnalysis> findByDocumentId(Long documentId);
    List<AiDocumentAnalysis> findByPatientIdOrderByCreatedAtDesc(Long patientId);
}

