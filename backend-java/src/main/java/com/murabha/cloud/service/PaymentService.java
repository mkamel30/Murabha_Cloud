package com.murabha.cloud.service;

import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.PaymentRepository;
import com.murabha.cloud.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final com.murabha.cloud.repository.MachineSaleRepository saleRepository;
    private final com.murabha.cloud.repository.InstallmentRepository installmentRepository;
    private final AuditService auditService;
    private final RealtimeEventService realtimeEventService;

    @Transactional(readOnly = true)
    public List<Payment> getAll(UUID branchId, UUID saleId, Instant startDate, Instant endDate) {
        return paymentRepository.findPaymentsWithFilters(branchId, saleId, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public Payment getById(UUID id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("سجل الدفعة غير موجود"));
        SecurityUtils.validateBranchAccess(payment.getBranchId());
        return payment;
    }

    @Transactional
    public Payment update(UUID id, Map<String, Object> updates) {
        Payment payment = getById(id);
        if (updates.containsKey("receiptNumber")) {
            payment.setReceiptNumber((String) updates.get("receiptNumber"));
        }
        if (updates.containsKey("paymentPlace")) {
            payment.setPaymentPlace((String) updates.get("paymentPlace"));
        }
        if (updates.containsKey("notes")) {
            payment.setNotes((String) updates.get("notes"));
        }
        if (updates.containsKey("paidAt")) {
            Object paidAtObj = updates.get("paidAt");
            if (paidAtObj instanceof String str && !str.isBlank()) {
                str = str.trim();
                try {
                    payment.setPaidAt(Instant.parse(str));
                } catch (Exception e) {
                    payment.setPaidAt(java.time.LocalDate.parse(str).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant());
                }
            }
        }
        payment = paymentRepository.save(payment);
        realtimeEventService.broadcast("PAYMENT", "UPDATED", payment.getSaleId(), payment.getBranchId());
        return payment;
    }

    @Transactional
    public void voidPayment(UUID paymentId, String reason) {
        Payment payment = getById(paymentId);
        if (Boolean.TRUE.equals(payment.getIsVoided())) {
            throw new com.murabha.cloud.exception.BadRequestException("هذه الدفعة ملغاة بالفعل");
        }

        // 1. Mark payment as voided
        payment.setIsVoided(true);
        payment.setVoidReason(reason != null && !reason.isBlank() ? reason : "إلغاء دفعة");
        payment.setVoidedAt(Instant.now());
        paymentRepository.save(payment);

        // 2. Reverse the payment amount from the sale
        com.murabha.cloud.entity.MachineSale sale = saleRepository.findById(payment.getSaleId())
                .orElseThrow(() -> new ResourceNotFoundException("العقد المرتبط بالدفعة غير موجود"));

        if ("DOWN_PAYMENT".equalsIgnoreCase(payment.getPaymentType())) {
            sale.setDownPayment(java.math.BigDecimal.ZERO);
        }

        sale.setPaidAmount(sale.getPaidAmount().subtract(payment.getAmount()));
        sale.setRemainingAmount(sale.getRemainingAmount().add(payment.getAmount()));
        if (sale.getRemainingAmount().compareTo(java.math.BigDecimal.ZERO) > 0 && "COMPLETED".equalsIgnoreCase(sale.getStatus())) {
            sale.setStatus("ACTIVE");
        }
        saleRepository.save(sale);

        // 3. Reverse installment allocations linked to this payment
        List<com.murabha.cloud.entity.Installment> installments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(sale.getId());
        for (com.murabha.cloud.entity.Installment inst : installments) {
            if (payment.getId().equals(inst.getPaymentId())) {
                inst.setPaidAmount(java.math.BigDecimal.ZERO);
                inst.setIsPaid(false);
                inst.setPaidDate(null);
                inst.setPaymentId(null);
                inst.setReceiptNumber(null);
                inst.setPaymentPlace(null);
                installmentRepository.save(inst);
            }
        }

        auditService.log("VOID_PAYMENT", "Payment", payment.getId().toString(), "تم إلغاء الدفعة لسبب: " + reason, null);
        realtimeEventService.broadcast("PAYMENT", "VOIDED", payment.getId(), sale.getBranchId());
        realtimeEventService.broadcast("SALE", "UPDATED", sale.getId(), sale.getBranchId());
        realtimeEventService.broadcast("INSTALLMENT", "UPDATED", sale.getId(), sale.getBranchId());
    }
}