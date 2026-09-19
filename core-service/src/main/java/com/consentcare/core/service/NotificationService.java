package com.consentcare.core.service;

import com.consentcare.core.dto.CareDtos.NotificationResponse;
import com.consentcare.core.model.Notification;
import com.consentcare.core.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationSseService sseService;

    @Transactional
    public Notification createNotification(Long recipientUserId, String type, String title, String message, String referenceType, String referenceId) {
        Notification notification = Notification.builder()
                .recipientUserId(recipientUserId)
                .type(type)
                .title(title)
                .message(message)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .readStatus(false)
                .createdAt(OffsetDateTime.now())
                .build();

        notification = notificationRepository.save(notification);

        // Push real-time event via SSE to user
        NotificationResponse dto = toDto(notification);
        sseService.emitToUser(recipientUserId, type, dto);

        return notification;
    }

    public List<NotificationResponse> getUserNotifications(Long recipientUserId) {
        return notificationRepository.findTop100ByRecipientUserIdOrderByCreatedAtDesc(recipientUserId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void markAsRead(Long notificationId, Long recipientUserId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getRecipientUserId().equals(recipientUserId)) {
                n.setReadStatus(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void markAllAsRead(Long recipientUserId) {
        List<Notification> unread = notificationRepository.findByRecipientUserIdAndReadStatusFalseOrderByCreatedAtDesc(recipientUserId);
        for (Notification n : unread) {
            n.setReadStatus(true);
        }
        notificationRepository.saveAll(unread);
    }

    public long getUnreadCount(Long recipientUserId) {
        return notificationRepository.countByRecipientUserIdAndReadStatusFalse(recipientUserId);
    }

    private NotificationResponse toDto(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getRecipientUserId(),
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.getReferenceType(),
                n.getReferenceId(),
                n.isReadStatus(),
                n.getCreatedAt()
        );
    }
}

