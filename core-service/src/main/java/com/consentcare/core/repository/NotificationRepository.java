package com.consentcare.core.repository;

import com.consentcare.core.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId);
    List<Notification> findByRecipientUserIdAndReadStatusFalseOrderByCreatedAtDesc(Long recipientUserId);
    long countByRecipientUserIdAndReadStatusFalse(Long recipientUserId);
}

