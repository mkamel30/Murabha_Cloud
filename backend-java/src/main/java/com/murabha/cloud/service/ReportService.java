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
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final MachineSaleRepository saleRepository;
    private final PaymentRepository paymentRepository;
    private final InstallmentRepository installmentRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> salesReport(UUID branchId, LocalDate startDate, LocalDate endDate, String saleType) {
        List<MachineSale> sales = saleRepository.findSalesForReport(branchId, startDate, endDate, saleType);

        BigDecimal totalAmount = sales.stream().map(MachineSale::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid = sales.stream().map(MachineSale::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRemaining = sales.stream().map(MachineSale::getRemainingAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> summary = Map.of(
                "totalSales", sales.size(),
                "totalAmount", totalAmount,
                "totalPaid", totalPaid,
                "totalRemaining", totalRemaining
        );

        return Map.of("sales", sales, "summary", summary);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> collectionsReport(UUID branchId, Instant startDate, Instant endDate, String paymentType, String paymentPlace) {
        List<Payment> payments = paymentRepository.findPaymentsWithFilters(branchId, null, startDate, endDate);
        if (paymentType != null && !paymentType.isBlank()) {
            payments = payments.stream().filter(p -> paymentType.equalsIgnoreCase(p.getPaymentType())).toList();
        }
        if (paymentPlace != null && !paymentPlace.isBlank()) {
            payments = payments.stream().filter(p -> paymentPlace.equalsIgnoreCase(p.getPaymentPlace())).toList();
        }

        BigDecimal totalAmount = payments.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> summary = Map.of(
                "totalPayments", payments.size(),
                "totalAmount", totalAmount
        );

        return Map.of("payments", payments, "summary", summary);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> overdueReport(UUID branchId) {
        List<Installment> overdue = installmentRepository.findOverdueInstallments(branchId, LocalDate.now());
        BigDecimal totalAmount = overdue.stream()
                .map(i -> i.getAmount().subtract(i.getPaidAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "overdue", overdue,
                "summary", Map.of("totalOverdue", overdue.size(), "totalAmount", totalAmount)
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> customerStatement(UUID customerId) {
        Customer customer = customerRepository.findById(customerId).orElse(null);
        List<MachineSale> sales = saleRepository.findByCustomerIdOrderBySaleDateDesc(customerId);

        BigDecimal totalSales = sales.stream().map(MachineSale::getTotalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid = sales.stream().map(MachineSale::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRemaining = sales.stream().map(MachineSale::getRemainingAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "customer", customer != null ? customer : Map.of(),
                "sales", sales,
                "summary", Map.of("totalSales", totalSales, "totalPaid", totalPaid, "totalRemaining", totalRemaining)
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> collectionRatioReport(UUID branchId, LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Installment> dueList = installmentRepository.findInstallmentsWithFilters(branchId, null, null, start, end);
        BigDecimal totalDue = dueList.stream().map(Installment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        Instant startInst = start.atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
        Instant endInst = end.plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
        List<Payment> collectedList = paymentRepository.findPaymentsWithFilters(branchId, null, startInst, endInst);
        BigDecimal totalCollected = collectedList.stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal ratio = totalDue.compareTo(BigDecimal.ZERO) > 0
                ? totalCollected.divide(totalDue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        return Map.of(
                "totalDue", totalDue,
                "totalCollected", totalCollected,
                "ratio", ratio,
                "dueInstallmentsCount", dueList.size(),
                "paymentsCount", collectedList.size()
        );
    }
}