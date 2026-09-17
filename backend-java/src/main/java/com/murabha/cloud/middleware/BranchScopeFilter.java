package com.murabha.cloud.middleware;

import com.murabha.cloud.entity.UserRole;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.security.UserPrincipal;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class BranchScopeFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
                boolean isHQ = principal.getRole() == UserRole.SUPER_ADMIN ||
                               principal.getRole() == UserRole.HQ_MANAGER ||
                               principal.getRole() == UserRole.HQ_ACCOUNTANT;

                String requestedBranch = request.getHeader("x-branch-id");
                if (!StringUtils.hasText(requestedBranch)) {
                    requestedBranch = request.getParameter("branchId");
                }

                if (isHQ) {
                    if (StringUtils.hasText(requestedBranch) && !"ALL".equalsIgnoreCase(requestedBranch)) {
                        try {
                            BranchContext.setBranchId(UUID.fromString(requestedBranch));
                        } catch (IllegalArgumentException e) {
                            BranchContext.clear();
                        }
                    } else {
                        BranchContext.clear(); // Cross-branch view
                    }
                } else {
                    // Non-HQ user is strictly locked to their branch
                    UUID userBranchId = principal.getBranchId();
                    
                    // Anti-BOLA / IDOR detection
                    if (StringUtils.hasText(requestedBranch) && !"ALL".equalsIgnoreCase(requestedBranch)) {
                        try {
                            UUID requestedId = UUID.fromString(requestedBranch);
                            if (userBranchId == null || !userBranchId.equals(requestedId)) {
                                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                response.setContentType("application/json;charset=UTF-8");
                                response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Access denied: unauthorized cross-branch attempt\"}");
                                return;
                            }
                        } catch (IllegalArgumentException e) {
                            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                            return;
                        }
                    }
                    BranchContext.setBranchId(userBranchId);
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            BranchContext.clear();
        }
    }
}