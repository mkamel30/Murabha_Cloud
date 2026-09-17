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

    @Async
    public void log(String action, String targetEntity, String targetId, String details, HttpServletRequest request) {
        try {
            AuditLog.AuditLogBuilder builder = AuditLog.builder()
                    .action(action)
                    .targetEntity(targetEntity)
                    .targetId(targetId)
                    .details(details)
                    .createdAt(Instant.now());

            if (request != null) {
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isBlank()) {
                    ip = request.getRemoteAddr();
                }
                builder.ipAddress(ip);
                builder.userAgent(request.getHeader("User-Agent"));
            }

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
                builder.userId(principal.getId());
                builder.username(principal.getUsername());
                builder.role(principal.getRole().name());
                builder.branchId(principal.getBranchId() != null ? principal.getBranchId() : BranchContext.getBranchId());
            }

            auditLogRepository.save(builder.build());
        } catch (Exception ignored) {
            // Audit log must never block primary operations
        }
    }
}