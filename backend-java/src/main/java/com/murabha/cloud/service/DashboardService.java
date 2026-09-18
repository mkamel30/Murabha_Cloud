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
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PaymentRepository paymentRepository;
    private final InstallmentRepository installmentRepository;
    private final MachineSaleRepository saleRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getStats(UUID branchId) {
        LocalDate today = LocalDate.now();
        Instant startOfToday = today.atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
        Instant endOfToday = today.plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC);

        // 1. Today collections
        List<Payment> todayPayments = paymentRepository.findPaymentsWithFilters(branchId, null, startOfToday, endOfToday);
        BigDecimal todayCollections = todayPayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Overdue installments
        List<Installment> overdueList = installmentRepository.findOverdueInstallments(branchId, today);
        BigDecimal overdueTotal = overdueList.stream()
                .map(i -> i.getAmount().subtract(i.getPaidAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Due this month
        LocalDate startOfMonth = today.with(TemporalAdjusters.firstDayOfMonth());
        LocalDate endOfMonth = today.with(TemporalAdjusters.lastDayOfMonth());
        List<Installment> monthInstallments = installmentRepository.findInstallmentsWithFilters(branchId, null, false, startOfMonth, endOfMonth);
        BigDecimal dueThisMonthTotal = monthInstallments.stream()
                .map(i -> i.getAmount().subtract(i.getPaidAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 4. Sales totals via direct DB SQL aggregations (no full table entity loads into JVM heap)
        List<Object[]> aggList = saleRepository.getSalesAggregateTotals(branchId);
        BigDecimal totalPaidAll = BigDecimal.ZERO;
        BigDecimal totalRemainingAll = BigDecimal.ZERO;
        BigDecimal totalSalesCount = BigDecimal.ZERO;
        if (aggList != null && !aggList.isEmpty()) {
            Object[] row = aggList.get(0);
            totalPaidAll = row[0] != null ? (BigDecimal) row[0] : BigDecimal.ZERO;
            totalRemainingAll = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            totalSalesCount = row[2] != null ? BigDecimal.valueOf(((Number) row[2]).longValue()) : BigDecimal.ZERO;
        }

        BigDecimal cashSalesTotal = saleRepository.sumTotalPriceByType(branchId, "CASH");
        if (cashSalesTotal == null) cashSalesTotal = BigDecimal.ZERO;
        BigDecimal installmentSalesTotal = saleRepository.sumTotalPriceByType(branchId, "INSTALLMENT");
        if (installmentSalesTotal == null) installmentSalesTotal = BigDecimal.ZERO;

        long activeCustomers = branchId != null ? customerRepository.countByBranchId(branchId) : customerRepository.count();

        return Map.ofEntries(
                Map.entry("todayCollections", todayCollections),
                Map.entry("todayPaymentCount", todayPayments.size()),
                Map.entry("overdueTotal", overdueTotal),
                Map.entry("overdueCount", overdueList.size()),
                Map.entry("cashSalesTotal", cashSalesTotal),
                Map.entry("installmentSalesTotal", installmentSalesTotal),
                Map.entry("totalSalesCount", totalSalesCount),
                Map.entry("totalPaidAll", totalPaidAll),
                Map.entry("totalRemainingAll", totalRemainingAll),
                Map.entry("activeCustomers", activeCustomers),
                Map.entry("dueThisMonth", monthInstallments.size()),
                Map.entry("dueThisMonthTotal", dueThisMonthTotal),
                Map.entry("recentPayments", todayPayments.stream().limit(10).toList()),
                Map.entry("upcomingDue", monthInstallments.stream().limit(10).toList())
        );
    }
}