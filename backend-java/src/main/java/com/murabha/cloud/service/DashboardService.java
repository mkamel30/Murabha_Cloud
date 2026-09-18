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

        // 4. Sales totals
        List<MachineSale> allSales = saleRepository.findSalesForReport(branchId, null, null, null);
        BigDecimal totalSalesCount = BigDecimal.valueOf(allSales.size());
        BigDecimal totalPaidAll = allSales.stream().map(MachineSale::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRemainingAll = allSales.stream().map(MachineSale::getRemainingAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cashSalesTotal = allSales.stream()
                .filter(s -> "CASH".equalsIgnoreCase(s.getSaleType()))
                .map(MachineSale::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal installmentSalesTotal = allSales.stream()
                .filter(s -> !"CASH".equalsIgnoreCase(s.getSaleType()))
                .map(MachineSale::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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