package com.murabha.cloud.controller;

import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.repository.MachineSaleRepository;
import com.murabha.cloud.repository.PaymentRepository;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;
    private final PaymentRepository paymentRepository;
    private final MachineSaleRepository saleRepository;

    @GetMapping("/sales")
    public ResponseEntity<byte[]> exportSales() throws IOException {
        byte[] bytes = exportService.exportSalesExcel(BranchContext.getBranchId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sales.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/collections")
    public ResponseEntity<byte[]> exportCollections() throws IOException {
        byte[] bytes = exportService.exportCollectionsExcel(BranchContext.getBranchId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=collections.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/overdue")
    public ResponseEntity<byte[]> exportOverdue() throws IOException {
        byte[] bytes = exportService.exportOverdueExcel(BranchContext.getBranchId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=overdue-report.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/receipt/{paymentId}")
    public ResponseEntity<String> printableReceipt(@PathVariable UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("الدفعة غير موجودة"));
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(exportService.generateReceiptHtml(payment));
    }

    @GetMapping("/contract/{saleId}")
    public ResponseEntity<String> printableContract(@PathVariable UUID saleId) {
        MachineSale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new IllegalArgumentException("العقد غير موجود"));
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(exportService.generateContractHtml(sale));
    }

    @GetMapping("/clearance/{saleId}")
    public ResponseEntity<String> printableClearance(@PathVariable UUID saleId) {
        MachineSale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new IllegalArgumentException("العقد غير موجود"));
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(exportService.generateClearanceHtml(sale));
    }
}