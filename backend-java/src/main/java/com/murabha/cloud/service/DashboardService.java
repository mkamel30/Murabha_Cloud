package com.murabha.cloud.service;

import com.murabha.cloud.entity.Customer;
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

import java.util.function.Function;
import java.util.stream.Collectors;

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

        // 5. Recent payments across all time (limit 10)
        List<Payment> recentPaymentsList = paymentRepository.findPaymentsWithFilters(branchId, null, null, null)
                .stream()
                .limit(10)
                .toList();

        // 6. Upcoming due installments (from today onwards, limit 10)
        List<Installment> upcomingDueList = installmentRepository.findInstallmentsWithFilters(branchId, null, false, today, null)
                .stream()
                .limit(10)
                .toList();

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
                Map.entry("dueThisMonth", mapInstallmentsWithSaleAndCustomer(monthInstallments)),
                Map.entry("dueThisMonthTotal", dueThisMonthTotal),
                Map.entry("recentPayments", mapPaymentsWithSaleAndCustomer(recentPaymentsList)),
                Map.entry("upcomingDue", mapInstallmentsWithSaleAndCustomer(upcomingDueList))
        );
    }

    private List<Map<String, Object>> mapPaymentsWithSaleAndCustomer(List<Payment> payments) {
        if (payments == null || payments.isEmpty()) {
            return Collections.emptyList();
        }
        Set<UUID> saleIds = payments.stream()
                .map(Payment::getSaleId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, MachineSale> saleMap = saleRepository.findAllById(saleIds).stream()
                .collect(Collectors.toMap(MachineSale::getId, Function.identity(), (a, b) -> a));

        Set<UUID> customerIds = saleMap.values().stream()
                .map(MachineSale::getCustomerId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, Customer> customerMap = customerRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(Customer::getId, Function.identity(), (a, b) -> a));

        return payments.stream().map(p -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("receiptNumber", p.getReceiptNumber());
            map.put("saleId", p.getSaleId());
            map.put("paymentType", p.getPaymentType());
            map.put("amount", p.getAmount());
            map.put("paidAt", p.getPaidAt());
            MachineSale s = saleMap.get(p.getSaleId());
            if (s != null) {
                Map<String, Object> saleObj = new LinkedHashMap<>();
                saleObj.put("id", s.getId());
                saleObj.put("customerId", s.getCustomerId());
                Customer c = customerMap.get(s.getCustomerId());
                if (c != null) {
                    Map<String, Object> custObj = new LinkedHashMap<>();
                    custObj.put("id", c.getId());
                    custObj.put("name", c.getName());
                    custObj.put("bkCode", c.getBkCode());
                    saleObj.put("customer", custObj);
                }
                map.put("sale", saleObj);
            }
            return map;
        }).toList();
    }

    private List<Map<String, Object>> mapInstallmentsWithSaleAndCustomer(List<Installment> installments) {
        if (installments == null || installments.isEmpty()) {
            return Collections.emptyList();
        }
        Set<UUID> saleIds = installments.stream()
                .map(Installment::getSaleId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, MachineSale> saleMap = saleRepository.findAllById(saleIds).stream()
                .collect(Collectors.toMap(MachineSale::getId, Function.identity(), (a, b) -> a));

        Set<UUID> customerIds = saleMap.values().stream()
                .map(MachineSale::getCustomerId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, Customer> customerMap = customerRepository.findAllById(customerIds).stream()
                .collect(Collectors.toMap(Customer::getId, Function.identity(), (a, b) -> a));

        return installments.stream().map(i -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", i.getId());
            map.put("saleId", i.getSaleId());
            map.put("installmentNo", i.getInstallmentNo());
            map.put("dueDate", i.getDueDate());
            map.put("amount", i.getAmount());
            map.put("paidAmount", i.getPaidAmount());
            map.put("isPaid", i.getIsPaid());
            MachineSale s = saleMap.get(i.getSaleId());
            if (s != null) {
                Map<String, Object> saleObj = new LinkedHashMap<>();
                saleObj.put("id", s.getId());
                saleObj.put("customerId", s.getCustomerId());
                Customer c = customerMap.get(s.getCustomerId());
                if (c != null) {
                    Map<String, Object> custObj = new LinkedHashMap<>();
                    custObj.put("id", c.getId());
                    custObj.put("name", c.getName());
                    custObj.put("bkCode", c.getBkCode());
                    saleObj.put("customer", custObj);
                }
                map.put("sale", saleObj);
            }
            return map;
        }).toList();
    }
}