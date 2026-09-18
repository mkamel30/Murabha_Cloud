package com.murabha.cloud.security;

import com.murabha.cloud.entity.UserRole;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static UserPrincipal getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal;
        }
        return null;
    }

    public static boolean isHQ(UserPrincipal principal) {
        if (principal == null) return false;
        UserRole role = principal.getRole();
        return role == UserRole.SUPER_ADMIN || role == UserRole.HQ_MANAGER || role == UserRole.HQ_ACCOUNTANT;
    }

    public static void validateBranchAccess(UUID entityBranchId) {
        UserPrincipal principal = getCurrentUser();
        if (principal == null || isHQ(principal)) {
            return;
        }
        if (entityBranchId != null && principal.getBranchId() != null && !principal.getBranchId().equals(entityBranchId)) {
            throw new AccessDeniedException("غير مصرح: لا يمكنك الوصول أو تعديل سجلات تابعة لفرع آخر");
        }
    }
}