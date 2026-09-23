package com.murabha.cloud.service;

import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.InstallmentRepository;
import com.murabha.cloud.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InstallmentService {

    private final InstallmentRepository installmentRepository;
    private final SaleService saleService;
    private final RealtimeEventService realtimeEventService;

    @Transactional(readOnly = true)
    public List<Installment> getAll(UUID branchId, UUID saleId, Boolean isPaid, LocalDate startDate, LocalDate endDate) {
        return installmentRepository.findInstallmentsWithFilters(branchId, saleId, isPaid, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public List<Installment> getOverdue(UUID branchId) {
        return installmentRepository.findOverdueInstallments(branchId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public Installment getById(UUID id) {
        Installment installment = installmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("القسط غير موجود"));
        SecurityUtils.validateBranchAccess(installment.getBranchId());
        return installment;
    }

    @Transactional
    public Map<String, Object> pay(UUID installmentId, PaymentRequest req, UUID createdByUserId) {
        Installment installment = getById(installmentId);
        if (Boolean.TRUE.equals(installment.getIsPaid())) {
            throw new BadRequestException("القسط مدفوع بالكامل بالفعل");
        }

        // Validate sequential payment: ensure no prior installment for the same sale is unpaid
        List<Installment> priorUnpaid = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(installment.getSaleId())
                .stream()
                .filter(i -> i.getInstallmentNo() < installment.getInstallmentNo())
                .filter(i -> !Boolean.TRUE.equals(i.getIsPaid()) && !Boolean.TRUE.equals(i.getIsWaived()))
                .toList();

        if (!priorUnpaid.isEmpty()) {
            Installment earliest = priorUnpaid.get(0);
            throw new BadRequestException(String.format(
                    "لا يمكن سداد القسط رقم (%d) لوجود أقساط سابقة مستحقة لم يتم سدادها بعد (قسط رقم %d). يرجى سداد الأقساط بالترتيب الزمني.",
                    installment.getInstallmentNo(), earliest.getInstallmentNo()));
        }

        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            BigDecimal remainingOnInstallment = installment.getAmount().subtract(installment.getPaidAmount());
            req.setAmount(remainingOnInstallment);
        }
        
        req.setInstallmentIds(java.util.List.of(installmentId));
        return saleService.pay(installment.getSaleId(), req, createdByUserId);
    }

    @Transactional
    public Installment update(UUID id, Map<String, Object> updates) {
        Installment inst = getById(id);
        if (updates.containsKey("isPaid")) {
            throw new BadRequestException("لا يمكن تعديل حالة سداد القسط يدوياً. يرجى استخدام عملية السداد الرسمية لضمان النزاهة المحاسبية.");
        }
        if (updates.containsKey("receiptNumber")) {
            inst.setReceiptNumber((String) updates.get("receiptNumber"));
        }
        if (updates.containsKey("paymentPlace")) {
            inst.setPaymentPlace((String) updates.get("paymentPlace"));
        }
        inst = installmentRepository.save(inst);
        realtimeEventService.broadcast("INSTALLMENT", "UPDATED", inst.getSaleId(), inst.getBranchId());
        return inst;
    }
}