package com.murabha.cloud.service;

import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.PaymentRepository;
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

    @Transactional(readOnly = true)
    public List<Payment> getAll(UUID branchId, UUID saleId, Instant startDate, Instant endDate) {
        return paymentRepository.findPaymentsWithFilters(branchId, saleId, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public Payment getById(UUID id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("سجل الدفعة غير موجود"));
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
        return paymentRepository.save(payment);
    }
}