package com.murabha.cloud.controller;

import com.murabha.cloud.entity.Notification;
import com.murabha.cloud.security.UserPrincipal;
import com.murabha.cloud.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(user));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount(user)));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllRead(@AuthenticationPrincipal UserPrincipal user) {
        notificationService.markAllAsRead(user);
        return ResponseEntity.ok(Map.of("message", "تم تحديد جميع الإشعارات كمقروءة"));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }
}