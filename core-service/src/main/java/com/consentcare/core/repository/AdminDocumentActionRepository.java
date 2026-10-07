package com.consentcare.core.repository;

import com.consentcare.core.model.AdminDocumentAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminDocumentActionRepository extends JpaRepository<AdminDocumentAction, Long> {
    List<AdminDocumentAction> findByDocumentIdOrderByTimestampDesc(Long documentId);
    List<AdminDocumentAction> findByAdminUserIdOrderByTimestampDesc(Long adminUserId);
}

