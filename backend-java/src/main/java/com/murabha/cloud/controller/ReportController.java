package com.murabha.cloud.controller;

import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/sales")
    public ResponseEntity<Map<String, Object>> salesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String saleType) {
        return ResponseEntity.ok(reportService.salesReport(BranchContext.getBranchId(), startDate, endDate, saleType));
    }

    @GetMapping("/collections")
    public ResponseEntity<Map<String, Object>> collectionsReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @RequestParam(required = false) String paymentType,
            @RequestParam(required = false) String paymentPlace) {
        return ResponseEntity.ok(reportService.collectionsReport(BranchContext.getBranchId(), startDate, endDate, paymentType, paymentPlace));
    }

    @GetMapping("/overdue")
    public ResponseEntity<Map<String, Object>> overdueReport() {
        return ResponseEntity.ok(reportService.overdueReport(BranchContext.getBranchId()));
    }

    @GetMapping("/customer/{id}")
    public ResponseEntity<Map<String, Object>> customerStatement(@PathVariable UUID id) {
        return ResponseEntity.ok(reportService.customerStatement(id));
    }

    @GetMapping("/collection-ratio")
    public ResponseEntity<Map<String, Object>> collectionRatio(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.collectionRatioReport(BranchContext.getBranchId(), startDate, endDate));
    }
}