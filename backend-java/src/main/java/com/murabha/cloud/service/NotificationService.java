package com.murabha.cloud.service;

import com.murabha.cloud.entity.Notification;
import com.murabha.cloud.repository.NotificationRepository;
import com.murabha.cloud.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void createNotificationForRole(UUID branchId, String targetRole, String title, String message, String actionUrl) {
        Notification notification = Notification.builder()
                .branchId(branchId)
                .targetRole(targetRole)
                .title(title)
                .message(message)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    public void createNotificationForUser(UUID userId, String title, String message, String actionUrl) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForUser(UserPrincipal user) {
        return notificationRepository.findForUser(user.getId(), user.getBranchId(), user.getRole().name());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UserPrincipal user) {
        return notificationRepository.countUnreadForUser(user.getId(), user.getBranchId(), user.getRole().name());
    }

    @Transactional
    public void markAllAsRead(UserPrincipal user) {
        notificationRepository.markAllAsReadForUser(user.getId(), user.getBranchId(), user.getRole().name());
    }

    @Transactional
    public void markAsRead(UUID notifId) {
        notificationRepository.findById(notifId).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }
}