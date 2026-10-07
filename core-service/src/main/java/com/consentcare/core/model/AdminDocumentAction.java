package com.consentcare.core.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "admin_document_actions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDocumentAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "admin_user_id", nullable = false)
    private Long adminUserId;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType; // VIEW_METADATA, VIEW_CONTENT, DOWNLOAD, REMOVE, RESTORE

    @Column(name = "administrative_reason", columnDefinition = "TEXT", nullable = false)
    private String administrativeReason;

    @Column(nullable = false)
    @Builder.Default
    private OffsetDateTime timestamp = OffsetDateTime.now();

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String result = "SUCCESS";
}

