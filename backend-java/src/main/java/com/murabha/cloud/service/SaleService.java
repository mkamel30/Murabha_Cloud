package com.murabha.cloud.service;

import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.dto.SaleCreateRequest;
import com.murabha.cloud.entity.Customer;
import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.InstallmentRepository;
import com.murabha.cloud.repository.MachineSaleRepository;
import com.murabha.cloud.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SaleService {

    private final MachineSaleRepository saleRepository;
    private final CustomerRepository customerRepository;
    private final InstallmentRepository installmentRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public Page<MachineSale> getAll(UUID branchId, UUID customerId, String status, String saleType,
                                   LocalDate startDate, LocalDate endDate, Pageable pageable) {
        return saleRepository.findSalesWithFilters(branchId, customerId, status, saleType, startDate, endDate, pageable);
    }

    @Transactional(readOnly = true)
    public MachineSale getById(UUID id) {
        return saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("عقد البيع غير موجود"));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkSerial(String serial) {
        if (serial == null || serial.isBlank()) {
            return Map.of("available", true);
        }
        String cleanSerial = serial.trim().toUpperCase();
        List<MachineSale> activeSales = saleRepository.findByMachineSerialIgnoreCaseAndStatusNot(cleanSerial, "VOIDED");
        if (!activeSales.isEmpty()) {
            MachineSale existing = activeSales.get(0);
            return Map.of(
                    "available", false,
                    "message", "رقم الماكينة مستخدم بالفعل في عقد نشط رقم: " + existing.getReceiptNumber(),
                    "existingSale", Map.of("id", existing.getId(), "receiptNumber", existing.getReceiptNumber())
            );
        }
        return Map.of("available", true);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkReceipt(String receipt) {
        if (receipt == null || receipt.isBlank()) {
            return Map.of("available", true);
        }
        String cleanReceipt = receipt.trim();
        Optional<Payment> payment = paymentRepository.findByReceiptNumber(cleanReceipt);
        if (payment.isPresent()) {
            return Map.of("available", false, "message", "رقم الإيصال مستخدم بالفعل في الدفعات");
        }
        Optional<MachineSale> sale = saleRepository.findByReceiptNumber(cleanReceipt);
        if (sale.isPresent()) {
            return Map.of("available", false, "message", "رقم الإيصال مستخدم كعقد بيع");
        }
        return Map.of("available", true);
    }

    @Transactional
    public MachineSale create(SaleCreateRequest req, UUID branchId, UUID createdByUserId) {
        Customer customer = customerRepository.findById(req.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("العميل غير موجود"));

        String serial = req.getMachineSerial().trim().toUpperCase();
        Map<String, Object> serialCheck = checkSerial(serial);
        if (Boolean.FALSE.equals(serialCheck.get("available"))) {
            throw new BadRequestException((String) serialCheck.get("message"));
        }

        BigDecimal totalPrice = req.getTotalPrice();
        BigDecimal downPayment = req.getDownPayment() != null ? req.getDownPayment() : BigDecimal.ZERO;

        if (downPayment.compareTo(BigDecimal.ZERO) > 0) {
            if (req.getDownPaymentReceipt() == null || req.getDownPaymentReceipt().isBlank()) {
                throw new BadRequestException("يجب إدخال رقم إيصال الدفعة المقدمة");
            }
            Map<String, Object> receiptCheck = checkReceipt(req.getDownPaymentReceipt().trim());
            if (Boolean.FALSE.equals(receiptCheck.get("available"))) {
                throw new BadRequestException((String) receiptCheck.get("message"));
            }
        }

        String saleType = req.getSaleType() != null ? req.getSaleType().toUpperCase() : "INSTALLMENT";
        String receiptNumber = generateReceiptNumber();

        MachineSale sale = MachineSale.builder()
                .receiptNumber(receiptNumber)
                .customerId(customer.getId())
                .machineSerial(serial)
                .saleType(saleType)
                .totalPrice(totalPrice)
                .downPayment(downPayment)
                .downPaymentReceipt(req.getDownPaymentReceipt())
                .paidAmount(BigDecimal.ZERO)
                .remainingAmount(totalPrice)
                .paymentPlace(req.getPaymentPlace() != null ? req.getPaymentPlace() : "Damen")
                .notes(req.getNotes())
                .saleDate(req.getSaleDate())
                .firstDueDate(req.getFirstDueDate())
                .months(req.getMonths())
                .status("ACTIVE")
                .branchId(branchId != null ? branchId : customer.getBranchId())
                .createdByUserId(createdByUserId)
                .build();

        sale = saleRepository.save(sale);

        if ("CASH".equalsIgnoreCase(saleType)) {
            // Full cash settlement
            sale.setPaidAmount(totalPrice);
            sale.setRemainingAmount(BigDecimal.ZERO);
            sale.setStatus("COMPLETED");

            Payment cashPayment = Payment.builder()
                    .receiptNumber(req.getDownPaymentReceipt() != null ? req.getDownPaymentReceipt() : receiptNumber)
                    .saleId(sale.getId())
                    .paymentType("FULL_PAYMENT")
                    .amount(totalPrice)
                    .paymentPlace(sale.getPaymentPlace())
                    .paidAt(Instant.now())
                    .branchId(sale.getBranchId())
                    .createdByUserId(createdByUserId)
                    .build();
            paymentRepository.save(cashPayment);

        } else {
            // Installment schedule generation
            BigDecimal debtToSchedule = totalPrice.subtract(downPayment);
            int months = req.getMonths() != null && req.getMonths() > 0 ? req.getMonths() : 12;
            LocalDate firstDue = req.getFirstDueDate() != null ? req.getFirstDueDate() : req.getSaleDate().plusMonths(1);

            BigDecimal baseInstallment = debtToSchedule.divide(BigDecimal.valueOf(months), 2, RoundingMode.DOWN);
            BigDecimal totalScheduled = BigDecimal.ZERO;

            List<Installment> installments = new ArrayList<>();
            for (int i = 1; i <= months; i++) {
                BigDecimal instAmount = baseInstallment;
                if (i == months) {
                    instAmount = debtToSchedule.subtract(totalScheduled); // Add remainder to final installment
                } else {
                    totalScheduled = totalScheduled.add(instAmount);
                }

                Installment installment = Installment.builder()
                        .saleId(sale.getId())
                        .installmentNo(i)
                        .dueDate(firstDue.plusMonths(i - 1))
                        .amount(instAmount)
                        .paidAmount(BigDecimal.ZERO)
                        .isPaid(false)
                        .isWaived(false)
                        .branchId(sale.getBranchId())
                        .build();
                installments.add(installment);
            }
            installmentRepository.saveAll(installments);
            sale.setInstallments(installments);

            if (downPayment.compareTo(BigDecimal.ZERO) > 0) {
                sale.setPaidAmount(downPayment);
                sale.setRemainingAmount(totalPrice.subtract(downPayment));

                Payment dpPayment = Payment.builder()
                        .receiptNumber(req.getDownPaymentReceipt().trim())
                        .saleId(sale.getId())
                        .paymentType("DOWN_PAYMENT")
                        .amount(downPayment)
                        .paymentPlace(sale.getPaymentPlace())
                        .paidAt(Instant.now())
                        .branchId(sale.getBranchId())
                        .createdByUserId(createdByUserId)
                        .build();
                paymentRepository.save(dpPayment);
            }
        }

        return saleRepository.save(sale);
    }

    @Transactional
    public Map<String, Object> pay(UUID saleId, PaymentRequest req, UUID createdByUserId) {
        MachineSale sale = getById(saleId);
        if ("VOIDED".equalsIgnoreCase(sale.getStatus())) {
            throw new BadRequestException("لا يمكن سداد دفعة لعقد بيع ملغي");
        }

        BigDecimal amount = req.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("يجب أن يكون مبلغ السداد أكبر من صفر");
        }

        String receiptNumber = req.getReceiptNumber() != null && !req.getReceiptNumber().isBlank()
                ? req.getReceiptNumber().trim()
                : generatePaymentReceipt();

        Map<String, Object> receiptCheck = checkReceipt(receiptNumber);
        if (Boolean.FALSE.equals(receiptCheck.get("available"))) {
            throw new BadRequestException((String) receiptCheck.get("message"));
        }

        Payment payment = Payment.builder()
                .receiptNumber(receiptNumber)
                .saleId(sale.getId())
                .paymentType(req.getPaymentType() != null ? req.getPaymentType() : "INSTALLMENT")
                .amount(amount)
                .paymentPlace(req.getPaymentPlace() != null ? req.getPaymentPlace() : sale.getPaymentPlace())
                .notes(req.getNotes())
                .paidAt(req.getPaidAt() != null ? req.getPaidAt() : Instant.now())
                .branchId(sale.getBranchId())
                .createdByUserId(createdByUserId)
                .build();
        payment = paymentRepository.save(payment);

        // FIFO Allocation across unpaid installments
        List<Installment> installments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(sale.getId());
        BigDecimal remainingToAllocate = amount;

        for (Installment inst : installments) {
            if (Boolean.TRUE.equals(inst.getIsPaid()) || Boolean.TRUE.equals(inst.getIsWaived())) {
                continue;
            }

            BigDecimal instUnpaid = inst.getAmount().subtract(inst.getPaidAmount());
            if (remainingToAllocate.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            if (remainingToAllocate.compareTo(instUnpaid) >= 0) {
                inst.setPaidAmount(inst.getAmount());
                inst.setIsPaid(true);
                inst.setPaidDate(LocalDate.now());
                inst.setReceiptNumber(receiptNumber);
                inst.setPaymentId(payment.getId());
                inst.setPaymentPlace(payment.getPaymentPlace());
                remainingToAllocate = remainingToAllocate.subtract(instUnpaid);
            } else {
                inst.setPaidAmount(inst.getPaidAmount().add(remainingToAllocate));
                inst.setPaidDate(LocalDate.now());
                inst.setReceiptNumber(receiptNumber);
                inst.setPaymentId(payment.getId());
                inst.setPaymentPlace(payment.getPaymentPlace());
                remainingToAllocate = BigDecimal.ZERO;
            }
            installmentRepository.save(inst);
        }

        sale.setPaidAmount(sale.getPaidAmount().add(amount));
        sale.setRemainingAmount(sale.getRemainingAmount().subtract(amount));
        if (sale.getRemainingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            sale.setStatus("COMPLETED");
            sale.setRemainingAmount(BigDecimal.ZERO);
        }
        saleRepository.save(sale);

        return Map.of("receiptNumber", receiptNumber, "amount", amount);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewPayment(UUID saleId, BigDecimal amount, List<UUID> selectedInstallmentIds) {
        MachineSale sale = getById(saleId);
        List<Installment> installments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(sale.getId());

        List<Map<String, Object>> distribution = new ArrayList<>();
        BigDecimal remainingToAllocate = amount != null ? amount : BigDecimal.ZERO;

        for (Installment inst : installments) {
            if (Boolean.TRUE.equals(inst.getIsPaid()) || Boolean.TRUE.equals(inst.getIsWaived())) {
                continue;
            }

            BigDecimal instUnpaid = inst.getAmount().subtract(inst.getPaidAmount());
            BigDecimal applied = BigDecimal.ZERO;

            if (remainingToAllocate.compareTo(BigDecimal.ZERO) > 0) {
                if (remainingToAllocate.compareTo(instUnpaid) >= 0) {
                    applied = instUnpaid;
                    remainingToAllocate = remainingToAllocate.subtract(instUnpaid);
                } else {
                    applied = remainingToAllocate;
                    remainingToAllocate = BigDecimal.ZERO;
                }
            }

            distribution.add(Map.of(
                    "id", inst.getId(),
                    "installmentNo", inst.getInstallmentNo(),
                    "amount", inst.getAmount(),
                    "paidAmount", inst.getPaidAmount(),
                    "appliedAmount", applied,
                    "isPaid", inst.getPaidAmount().add(applied).compareTo(inst.getAmount()) >= 0
            ));
        }

        BigDecimal newRemaining = sale.getRemainingAmount().subtract(amount != null ? amount : BigDecimal.ZERO);
        return Map.of(
                "distribution", distribution,
                "remainingAmount", sale.getRemainingAmount(),
                "newRemainingAmount", newRemaining.max(BigDecimal.ZERO),
                "credit", remainingToAllocate
        );
    }

    @Transactional
    public void voidSale(UUID saleId, String reason) {
        MachineSale sale = getById(saleId);
        sale.setStatus("VOIDED");
        sale.setVoidReason(reason);
        sale.setVoidedAt(Instant.now());

        List<Installment> installments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(saleId);
        for (Installment inst : installments) {
            if (!Boolean.TRUE.equals(inst.getIsPaid())) {
                installmentRepository.delete(inst);
            }
        }
        saleRepository.save(sale);
    }

    private String generateReceiptNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = saleRepository.count();
        return String.format("SAL-%s-%04d", datePart, count + 1);
    }

    private String generatePaymentReceipt() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = paymentRepository.count();
        return String.format("PAY-%s-%04d", datePart, count + 1);
    }
}