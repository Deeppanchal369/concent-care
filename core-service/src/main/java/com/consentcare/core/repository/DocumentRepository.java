package com.consentcare.core.repository;

import com.consentcare.core.model.Document;
import com.consentcare.core.model.DocumentCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByPatientIdOrderByUploadedAtDesc(Long patientId);
    List<Document> findByPatientIdAndCategoryOrderByUploadedAtDesc(Long patientId, DocumentCategory category);

    Page<Document> findByPatientIdAndIsArchivedFalse(Long patientId, Pageable pageable);

    @Query("SELECT d FROM Document d WHERE d.patientId = :patientId AND d.isArchived = false " +
           "AND (:category IS NULL OR d.category = :category) " +
           "AND (:query IS NULL OR :query = '' OR " +
           "     LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "     LOWER(d.fileName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "     LOWER(d.originalFilename) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "     LOWER(d.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Document> searchDocuments(
            @Param("patientId") Long patientId,
            @Param("category") DocumentCategory category,
            @Param("query") String query,
            Pageable pageable
    );
}
