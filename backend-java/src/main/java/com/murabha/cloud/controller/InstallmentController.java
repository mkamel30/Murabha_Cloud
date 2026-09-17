package com.murabha.cloud.controller;

import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.security.UserPrincipal;
import com.murabha.cloud.service.InstallmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/installments")
@RequiredArgsConstructor
public class InstallmentController {

    private final InstallmentService installmentService;

    @GetMapping
    public ResponseEntity<List<Installment>> getAll(
            @RequestParam(required = false) UUID saleId,
            @RequestParam(required = false) Boolean isPaid,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(installmentService.getAll(BranchContext.getBranchId(), saleId, isPaid, startDate, endDate));
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<Installment>> getOverdue() {
        return ResponseEntity.ok(installmentService.getOverdue(BranchContext.getBranchId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Installment> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(installmentService.getById(id));
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<Map<String, Object>> pay(
            @PathVariable UUID id,
            @RequestBody PaymentRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(installmentService.pay(id, req, principal.getId()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Installment> update(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(installmentService.update(id, updates));
    }
}