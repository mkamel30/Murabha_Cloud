package com.murabha.cloud.service;

import com.murabha.cloud.entity.AuditLog;
import com.murabha.cloud.repository.AuditLogRepository;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void log(String action, String targetEntity, String targetId, String details, HttpServletRequest request) {
        String ip = null;
        String userAgent = null;
        if (request != null) {
            try {
                ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isBlank()) {
                    ip = request.getRemoteAddr();
                }
                userAgent = request.getHeader("User-Agent");
            } catch (Exception ignored) {}
        }

        UUID userId = null;
        String username = null;
        String role = null;
        UUID branchId = null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            userId = principal.getId();
            username = principal.getUsername();
            role = principal.getRole() != null ? principal.getRole().name() : null;
            branchId = principal.getBranchId() != null ? principal.getBranchId() : BranchContext.getBranchId();
        }

        logAsync(action, targetEntity, targetId, details, ip, userAgent, userId, username, role, branchId);
    }

    @Async
    public void logAsync(String action, String targetEntity, String targetId, String details,
                         String ip, String userAgent, UUID userId, String username, String role, UUID branchId) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .action(action)
                    .targetEntity(targetEntity)
                    .targetId(targetId)
                    .details(details)
                    .ipAddress(ip)
                    .userAgent(userAgent)
                    .userId(userId)
                    .username(username)
                    .role(role)
                    .branchId(branchId)
                    .createdAt(Instant.now())
                    .build();
            auditLogRepository.save(auditLog);
        } catch (Exception ignored) {
            // Audit log must never block primary operations
        }
    }
}