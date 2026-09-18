package com.murabha.cloud.controller;

import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.repository.*;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.time.SystemTimeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/database")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class AdminMaintenanceController {

    private final InstallmentRequestRepository installmentRequestRepository;
    private final InstallmentRepository installmentRepository;
    private final PaymentRepository paymentRepository;
    private final MachineSaleRepository saleRepository;
    private final FollowUpRepository followUpRepository;
    private final CustomerRepository customerRepository;

    @Value("${app.mfa.master-secret:}")
    private String masterMfaSecret;

    @PostMapping("/reset")
    @Transactional
    public ResponseEntity<Map<String, Object>> resetDatabase(@RequestBody Map<String, String> body) {
        if (masterMfaSecret == null || masterMfaSecret.isBlank() || "NVRW643UMF2HK3DM".equalsIgnoreCase(masterMfaSecret.trim())) {
            throw new BadRequestException("إجراء تصفير قاعدة البيانات معطل لأسباب أمنية. يجب ضبط مفتاح MFA سري فريد في خادم التشغيل أولاً.");
        }

        String code = body.get("code");
        if (code == null || code.isBlank()) {
            throw new BadRequestException("رمز التحقق MFA مطلوب لتنفيذ هذا الإجراء الحساس");
        }

        CodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());
        if (!verifier.isValidCode(masterMfaSecret.trim(), code.trim())) {
            throw new BadRequestException("رمز التحقق غير صحيح");
        }

        // Wipe operational tables in strict FK dependency order
        installmentRepository.deleteAllInBatch();
        paymentRepository.deleteAllInBatch();
        saleRepository.deleteAllInBatch();
        installmentRequestRepository.deleteAllInBatch();
        followUpRepository.deleteAllInBatch();
        customerRepository.deleteAllInBatch();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "تم تصفير قاعدة البيانات بنجاح مع الاحتفاظ بالمستخدمين والإعدادات"
        ));
    }
}