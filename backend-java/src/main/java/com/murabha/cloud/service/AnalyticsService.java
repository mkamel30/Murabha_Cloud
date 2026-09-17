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
        List<MachineSale> sales = saleRepository.findSalesForReport(branchId, null, null, null);
        List<Payment> payments = paymentRepository.findPaymentsWithFilters(branchId, null, null, null);
        List<Installment> overdue = installmentRepository.findOverdueInstallments(branchId, LocalDate.now());

        BigDecimal totalSales = sales.stream().map(MachineSale::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCollected = payments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRemaining = sales.stream().map(MachineSale::getRemainingAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        // Payment channels breakdown
        Map<String, BigDecimal> channelsMap = new HashMap<>();
        for (Payment p : payments) {
            String place = p.getPaymentPlace() != null ? p.getPaymentPlace() : "Damen";
            channelsMap.put(place, channelsMap.getOrDefault(place, BigDecimal.ZERO).add(p.getAmount()));
        }
        List<Map<String, Object>> paymentChannels = channelsMap.entrySet().stream()
                .map(e -> Map.of("channel", (Object) e.getKey(), "amount", e.getValue()))
                .toList();

        // Aging delinquency risk buckets: 1-30, 31-60, >60 days
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

        Map<String, Object> kpi = Map.of(
                "totalSales", totalSales,
                "totalCollected", totalCollected,
                "totalRemaining", totalRemaining,
                "activeContracts", sales.stream().filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus())).count(),
                "completedContracts", sales.stream().filter(s -> "COMPLETED".equalsIgnoreCase(s.getStatus())).count()
        );

        return Map.of(
                "kpi", kpi,
                "paymentChannels", paymentChannels,
                "overdueRisk", overdueRisk
        );
    }
}