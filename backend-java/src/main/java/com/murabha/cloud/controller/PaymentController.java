package com.murabha.cloud.controller;

import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public ResponseEntity<List<Payment>> getAll(
            @RequestParam(required = false) UUID saleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate) {
        return ResponseEntity.ok(paymentService.getAll(BranchContext.getBranchId(), saleId, startDate, endDate));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Payment> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER', 'HQ_ACCOUNTANT', 'BRANCH_MANAGER')")
    public ResponseEntity<Payment> update(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(paymentService.update(id, updates));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER')")
    public ResponseEntity<Map<String, Object>> voidPayment(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        paymentService.voidPayment(id, reason);
        return ResponseEntity.ok(Map.of("message", "تم إلغاء الدفعة بنجاح"));
    }
}