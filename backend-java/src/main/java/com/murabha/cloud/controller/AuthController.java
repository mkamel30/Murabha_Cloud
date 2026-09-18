package com.murabha.cloud.controller;

import com.murabha.cloud.dto.AuthResponse;
import com.murabha.cloud.dto.LoginRequest;
import com.murabha.cloud.entity.Branch;
import com.murabha.cloud.entity.User;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.repository.BranchRepository;
import com.murabha.cloud.repository.UserRepository;
import com.murabha.cloud.security.JwtTokenProvider;
import com.murabha.cloud.security.UserPrincipal;
import com.murabha.cloud.service.AuditService;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final AuditService auditService;

    // Rate Limiting per IP for Login (30 requests per 15 mins)
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    private Bucket createNewBucket() {
        Bandwidth limit = Bandwidth.classic(30, Refill.greedy(30, Duration.ofMinutes(15)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket getBucket(String ip) {
        return loginBuckets.computeIfAbsent(ip, k -> createNewBucket());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response) {

        String ip = request.getRemoteAddr();
        Bucket bucket = getBucket(ip);
        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too Many Requests", "message", "تم تجاوز الحد المسموح لمحاولات تسجيل الدخول، يرجى المحاولة لاحقاً"));
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            String accessToken = tokenProvider.generateAccessToken(principal);
            String refreshToken = tokenProvider.generateRefreshToken(principal);

            // Update last login
            userRepository.findById(principal.getId()).ifPresent(user -> {
                user.setLastLogin(Instant.now());
                userRepository.save(user);
            });

            // Set HttpOnly refresh token cookie (7 days)
            ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", refreshToken)
                    .httpOnly(true)
                    .secure(false) // Set to true in TLS production
                    .path("/api/auth")
                    .maxAge(7 * 24 * 60 * 60)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

            String branchName = null;
            if (principal.getBranchId() != null) {
                branchName = branchRepository.findById(principal.getBranchId()).map(Branch::getName).orElse(null);
            }

            auditService.log("LOGIN_SUCCESS", "User", principal.getId().toString(), "User logged in successfully", request);

            AuthResponse authResponse = AuthResponse.builder()
                    .accessToken(accessToken)
                    .user(AuthResponse.UserProfileDto.builder()
                            .id(principal.getId())
                            .username(principal.getUsername())
                            .name(principal.getName())
                            .email(principal.getEmail())
                            .role(principal.getRole().name())
                            .branchId(principal.getBranchId())
                            .branchName(branchName)
                            .build())
                    .build();

            return ResponseEntity.ok(authResponse);

        } catch (BadCredentialsException ex) {
            auditService.log("LOGIN_FAILED", "User", null, "Failed login attempt for: " + loginRequest.getUsername(), request);
            throw ex;
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request) {
        String refreshToken = null;
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("refreshToken".equals(c.getName())) {
                    refreshToken = c.getValue();
                    break;
                }
            }
        }

        if (refreshToken == null || !tokenProvider.validateToken(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "جلسة العمل منتهية الصلاحية"));
        }

        UUID userId = tokenProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("المستخدم غير موجود"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "تم تعطيل حساب المستخدم"));
        }

        UserPrincipal principal = UserPrincipal.create(user);
        String newAccessToken = tokenProvider.generateAccessToken(principal);

        return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response, HttpServletRequest request) {
        ResponseCookie clearCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .path("/api/auth")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearCookie.toString());
        auditService.log("LOGOUT", "User", null, "User logged out", request);
        return ResponseEntity.ok(Map.of("message", "تم تسجيل الخروج بنجاح"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        String branchName = null;
        if (principal.getBranchId() != null) {
            branchName = branchRepository.findById(principal.getBranchId()).map(Branch::getName).orElse(null);
        }

        String roleName = (principal.getRole() != null) ? principal.getRole().name() : null;

        AuthResponse.UserProfileDto dto = AuthResponse.UserProfileDto.builder()
                .id(principal.getId())
                .username(principal.getUsername())
                .name(principal.getName())
                .email(principal.getEmail())
                .role(roleName)
                .branchId(principal.getBranchId())
                .branchName(branchName)
                .build();

        return ResponseEntity.ok(Map.of("user", dto));
    }
}