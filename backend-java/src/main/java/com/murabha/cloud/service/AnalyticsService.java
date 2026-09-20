package com.murabha.cloud.service;

import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.InstallmentRepository;
import com.murabha.cloud.repository.MachineSaleRepository;
import com.murabha.cloud.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final MachineSaleRepository saleRepository;
    private final PaymentRepository paymentRepository;
    private final InstallmentRepository installmentRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardData(UUID branchId) {
        List<Object[]> aggList = saleRepository.getSalesAggregateTotals(branchId);
        BigDecimal totalCollected = BigDecimal.ZERO;
        BigDecimal totalRemaining = BigDecimal.ZERO;
        if (aggList != null && !aggList.isEmpty()) {
            Object[] row = aggList.get(0);
            totalCollected = row[0] != null ? (BigDecimal) row[0] : BigDecimal.ZERO;
            totalRemaining = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
        }
        BigDecimal totalSales = totalCollected.add(totalRemaining);

        // Payment channels breakdown (using a lighter query to get just payment places and amounts)
        // Since we don't have a direct query for grouping, we can fetch all but only select the needed fields.
        // Actually, for a quick fix, let's just create a custom query in PaymentRepository or avoid the huge object load.
        // Let's use the DB to sum by payment place.
        List<Object[]> channels = paymentRepository.sumByPaymentPlace(branchId);
        List<Map<String, Object>> paymentChannels = new ArrayList<>();
        if (channels != null) {
            for (Object[] row : channels) {
                String place = row[0] != null ? (String) row[0] : "Damen";
                BigDecimal amt = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
                paymentChannels.add(Map.of("channel", place, "amount", amt));
            }
        }

        // Aging delinquency risk buckets
        // Overdue list is usually much smaller than all sales/payments, so loading it is less risky, but let's just get it.
        List<Installment> overdue = installmentRepository.findOverdueInstallments(branchId, LocalDate.now());
        BigDecimal bucket1 = BigDecimal.ZERO;
        BigDecimal bucket2 = BigDecimal.ZERO;
        BigDecimal bucket3 = BigDecimal.ZERO;
        LocalDate today = LocalDate.now();

        for (Installment inst : overdue) {
            long days = ChronoUnit.DAYS.between(inst.getDueDate(), today);
            BigDecimal unpaid = inst.getAmount().subtract(inst.getPaidAmount());
            if (days <= 30) {
                bucket1 = bucket1.add(unpaid);
            } else if (days <= 60) {
                bucket2 = bucket2.add(unpaid);
            } else {
                bucket3 = bucket3.add(unpaid);
            }
        }

        List<Map<String, Object>> overdueRisk = List.of(
                Map.of("bucket", "1 - 30 يوم", "amount", bucket1),
                Map.of("bucket", "31 - 60 يوم", "amount", bucket2),
                Map.of("bucket", "أكثر من 60 يوم", "amount", bucket3)
        );

        long activeContracts = saleRepository.countByStatus(branchId, "ACTIVE");
        long completedContracts = saleRepository.countByStatus(branchId, "COMPLETED");

        Map<String, Object> kpi = Map.of(
                "totalSales", totalSales,
                "totalCollected", totalCollected,
                "totalRemaining", totalRemaining,
                "activeContracts", activeContracts,
                "completedContracts", completedContracts
        );

        return Map.of(
                "kpi", kpi,
                "paymentChannels", paymentChannels,
                "overdueRisk", overdueRisk
        );
    }
}