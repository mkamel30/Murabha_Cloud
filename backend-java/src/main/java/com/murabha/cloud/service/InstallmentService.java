package com.murabha.cloud.service;

import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.InstallmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InstallmentService {

    private final InstallmentRepository installmentRepository;
    private final SaleService saleService;

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
        return installmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("القسط غير موجود"));
    }

    @Transactional
    public Map<String, Object> pay(UUID installmentId, PaymentRequest req, UUID createdByUserId) {
        Installment installment = getById(installmentId);
        if (Boolean.TRUE.equals(installment.getIsPaid())) {
            throw new BadRequestException("القسط مدفوع بالكامل بالفعل");
        }
        return saleService.pay(installment.getSaleId(), req, createdByUserId);
    }

    @Transactional
    public Installment update(UUID id, Map<String, Object> updates) {
        Installment inst = getById(id);
        if (updates.containsKey("receiptNumber")) {
            inst.setReceiptNumber((String) updates.get("receiptNumber"));
        }
        if (updates.containsKey("paymentPlace")) {
            inst.setPaymentPlace((String) updates.get("paymentPlace"));
        }
        if (updates.containsKey("isPaid")) {
            inst.setIsPaid((Boolean) updates.get("isPaid"));
        }
        return installmentRepository.save(inst);
    }
}