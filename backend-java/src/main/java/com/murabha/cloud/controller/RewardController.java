package com.murabha.cloud.controller;

import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.InstallmentRepository;
import com.murabha.cloud.repository.MachineSaleRepository;
import com.murabha.cloud.repository.PaymentRepository;
import com.murabha.cloud.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rewards")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER')")
@RequiredArgsConstructor
public class RewardController {

    private final InstallmentRepository installmentRepository;
    private final MachineSaleRepository saleRepository;
    private final PaymentRepository paymentRepository;

    @PostMapping("/waive-installments")
    @Transactional
    public ResponseEntity<Map<String, Object>> waiveInstallments(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID saleId = UUID.fromString((String) body.get("saleId"));
        @SuppressWarnings("unchecked")
        List<String> rawIds = (List<String>) body.get("installmentIds");
        String reason = (String) body.get("reason");

        MachineSale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new ResourceNotFoundException("العقد غير موجود"));

        BigDecimal totalWaived = BigDecimal.ZERO;
        int count = 0;

        for (String rawId : rawIds) {
            Installment inst = installmentRepository.findById(UUID.fromString(rawId)).orElse(null);
            if (inst != null && !Boolean.TRUE.equals(inst.getIsPaid()) && !Boolean.TRUE.equals(inst.getIsWaived())) {
                BigDecimal unpaid = inst.getAmount().subtract(inst.getPaidAmount());
                totalWaived = totalWaived.add(unpaid);
                inst.setIsWaived(true);
                inst.setWaiveReason(reason != null ? reason : "مكافأة إعفاء أقساط");
                inst.setIsPaid(true);
                inst.setPaidDate(LocalDate.now());
                installmentRepository.save(inst);
                count++;
            }
        }

        if (totalWaived.compareTo(BigDecimal.ZERO) > 0) {
            Payment rewardPayment = Payment.builder()
                    .receiptNumber("RWD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                    .saleId(sale.getId())
                    .paymentType("REWARD")
                    .amount(totalWaived)
                    .paymentPlace("إعفاء إداري")
                    .notes(reason)
                    .paidAt(Instant.now())
                    .branchId(sale.getBranchId())
                    .createdByUserId(principal.getId())
                    .build();
            paymentRepository.save(rewardPayment);

            sale.setPaidAmount(sale.getPaidAmount().add(totalWaived));
            sale.setRemainingAmount(sale.getRemainingAmount().subtract(totalWaived));
            if (sale.getRemainingAmount().compareTo(BigDecimal.ZERO) <= 0) {
                sale.setStatus("COMPLETED");
                sale.setRemainingAmount(BigDecimal.ZERO);
            }
            saleRepository.save(sale);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "تم إعفاء الأقساط المحددة بنجاح",
                "waivedCount", count,
                "totalWaived", totalWaived
        ));
    }
}