package com.murabha.cloud.controller;

import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.dto.SaleCreateRequest;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.security.UserPrincipal;
import com.murabha.cloud.service.SaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String saleType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {

        int pageIdx = Math.max(0, page - 1);
        Page<MachineSale> paged = saleService.getAll(
                BranchContext.getBranchId(), customerId, status, saleType, startDate, endDate,
                PageRequest.of(pageIdx, limit, Sort.by("saleDate").descending())
        );

        return ResponseEntity.ok(Map.of(
                "sales", paged.getContent(),
                "total", paged.getTotalElements(),
                "page", page,
                "totalPages", paged.getTotalPages()
        ));
    }

    @GetMapping("/check-serial")
    public ResponseEntity<Map<String, Object>> checkSerial(@RequestParam String serial) {
        return ResponseEntity.ok(saleService.checkSerial(serial));
    }

    @GetMapping("/check-receipt")
    public ResponseEntity<Map<String, Object>> checkReceipt(@RequestParam String receipt) {
        return ResponseEntity.ok(saleService.checkReceipt(receipt));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MachineSale> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(saleService.getById(id));
    }

    @PostMapping
    public ResponseEntity<MachineSale> create(
            @Valid @RequestBody SaleCreateRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(saleService.create(req, BranchContext.getBranchId(), principal.getId()));
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<Map<String, Object>> pay(
            @PathVariable UUID id,
            @Valid @RequestBody PaymentRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(saleService.pay(id, req, principal.getId()));
    }

    @PostMapping("/{id}/payment")
    public ResponseEntity<Map<String, Object>> paymentAlias(
            @PathVariable UUID id,
            @Valid @RequestBody PaymentRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return pay(id, req, principal);
    }

    @PostMapping("/{id}/preview-payment")
    public ResponseEntity<Map<String, Object>> previewPayment(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        BigDecimal amount = BigDecimal.valueOf(Double.parseDouble(body.get("amount").toString()));
        return ResponseEntity.ok(saleService.previewPayment(id, amount, null));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER')")
    public ResponseEntity<Map<String, Object>> voidSale(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        saleService.voidSale(id, body.get("reason"));
        return ResponseEntity.ok(Map.of("message", "تم إلغاء العقد بنجاح"));
    }
}