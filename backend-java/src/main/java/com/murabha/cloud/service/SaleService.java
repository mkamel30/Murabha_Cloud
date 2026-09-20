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
import com.murabha.cloud.security.SecurityUtils;
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
    private final PaymentRepository paymentRepository;
    private final InstallmentRepository installmentRepository;
    private final CustomerRepository customerRepository;
    private final com.murabha.cloud.repository.InstallmentRequestRepository installmentRequestRepository;
    private final ReceiptSequenceService receiptSequenceService;
    private final AuditService auditService;
    private final com.murabha.cloud.repository.SystemSettingRepository systemSettingRepository;



    @Transactional(readOnly = true)
    public Page<MachineSale> getAll(UUID branchId, UUID customerId, String status, String saleType,
                                   LocalDate startDate, LocalDate endDate, Pageable pageable) {
        return saleRepository.findSalesWithFilters(branchId, customerId, status, saleType, startDate, endDate, pageable);
    }

    @Transactional(readOnly = true)
    public List<MachineSale> getAllList(UUID branchId, UUID customerId, String status, String saleType,
                                        LocalDate startDate, LocalDate endDate) {
        return saleRepository.findSalesWithFiltersList(branchId, customerId, status, saleType, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public MachineSale getById(UUID id) {
        MachineSale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("عقد البيع غير موجود"));
        SecurityUtils.validateBranchAccess(sale.getBranchId());
        if (sale.getCustomer() != null) {
            sale.getCustomer().getName();
        }
        if (sale.getInstallments() != null) {
            sale.getInstallments().size();
        }
        if (sale.getPayments() != null) {
            sale.getPayments().size();
        }
        return sale;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkSerial(String serial, UUID excludeRequestId) {
        if (serial == null || serial.isBlank()) {
            return Map.of("available", true);
        }
        String cleanSerial = serial.trim().toUpperCase();
        
        // 1. Check active sales
        List<MachineSale> activeSales = saleRepository.findByMachineSerialIgnoreCaseAndStatusNot(cleanSerial, "VOIDED");
        if (!activeSales.isEmpty()) {
            MachineSale existing = activeSales.get(0);
            return Map.of(
                    "available", false,
                    "message", "رقم الماكينة مستخدم بالفعل في عقد بيع: " + existing.getReceiptNumber(),
                    "existingSale", Map.of("id", existing.getId(), "receiptNumber", existing.getReceiptNumber())
            );
        }
        
        // 2. Check pending/approved installment requests
        List<com.murabha.cloud.entity.InstallmentRequest> pendingRequests = 
            installmentRequestRepository.findByMachineSerialIgnoreCaseAndStatusIn(
                cleanSerial, 
                List.of("PENDING_SUPERVISOR", "PENDING_MANAGER", "APPROVED")
            );

        if (excludeRequestId != null) {
            pendingRequests = pendingRequests.stream()
                .filter(r -> !excludeRequestId.equals(r.getId()))
                .toList();
        }
            
        if (!pendingRequests.isEmpty()) {
            com.murabha.cloud.entity.InstallmentRequest existingReq = pendingRequests.get(0);
            return Map.of(
                    "available", false,
                    "message", "رقم الماكينة محجوز في طلب تقسيط معلق برقم: " + existingReq.getRequestNumber(),
                    "existingRequest", Map.of("id", existingReq.getId(), "requestNumber", existingReq.getRequestNumber())
            );
        }

        return Map.of("available", true);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkSerial(String serial) {
        return checkSerial(serial, null);
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
        Map<String, Object> serialCheck = checkSerial(serial, req.getInstallmentRequestId());
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
        
        if ("INSTALLMENT".equals(saleType)) {
            Boolean requireGuarantor = systemSettingRepository.findById("requireGuarantor")
                    .map(s -> Boolean.parseBoolean(s.getValue()))
                    .orElse(false);
            if (Boolean.TRUE.equals(requireGuarantor)) {
                if (req.getGuarantorName() == null || req.getGuarantorName().isBlank() ||
                    req.getGuarantorNationalId() == null || req.getGuarantorNationalId().isBlank() ||
                    req.getGuarantorPhone() == null || req.getGuarantorPhone().isBlank()) {
                    throw new BadRequestException("بيانات الضامن مطلوبة (الاسم، الرقم القومي، ورقم الهاتف)");
                }
            }
        }

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
                .guarantorName(req.getGuarantorName())
                .guarantorNationalId(req.getGuarantorNationalId())
                .guarantorPhone(req.getGuarantorPhone())
                .guarantorRelation(req.getGuarantorRelation())
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

        sale = saleRepository.save(sale);
        auditService.log("CREATE_SALE", "MachineSale", sale.getId().toString(), "تم إنشاء عقد بيع جديد للعميل: " + customer.getName(), null);
        return sale;
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
        if (amount.compareTo(sale.getRemainingAmount()) > 0) {
            throw new BadRequestException(String.format("مبلغ السداد (%.2f) يتجاوز إجمالي المبلغ المتبقي على العقد (%.2f)", amount, sale.getRemainingAmount()));
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

        // FIFO Allocation across unpaid installments, but prioritize targeted installments first
        List<Installment> installments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(sale.getId());
        if (req.getInstallmentIds() != null && !req.getInstallmentIds().isEmpty()) {
            List<Installment> targeted = new ArrayList<>();
            List<Installment> others = new ArrayList<>();
            for (Installment inst : installments) {
                if (req.getInstallmentIds().contains(inst.getId())) targeted.add(inst);
                else others.add(inst);
            }
            installments = targeted;
            installments.addAll(others);
        }
        
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

        if (remainingToAllocate.compareTo(BigDecimal.ZERO) > 0) {
            Customer customer = sale.getCustomer();
            if (customer == null) {
                customer = customerRepository.findById(sale.getCustomerId()).orElse(null);
            }
            if (customer != null) {
                customer.setWalletBalance(customer.getWalletBalance().add(remainingToAllocate));
                customerRepository.save(customer);
                auditService.log("WALLET_DEPOSIT", "Customer", customer.getId().toString(), "تم إيداع مبلغ " + remainingToAllocate + " في المحفظة من فائض سداد قسط", null);
            }
        }

        BigDecimal saleActualAllocated = amount.subtract(remainingToAllocate);
        sale.setPaidAmount(sale.getPaidAmount().add(saleActualAllocated));
        sale.setRemainingAmount(sale.getRemainingAmount().subtract(saleActualAllocated));
        if (sale.getRemainingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            sale.setStatus("COMPLETED");
            sale.setRemainingAmount(BigDecimal.ZERO);
        }
        saleRepository.save(sale);
        auditService.log("PAY_INSTALLMENT", "MachineSale", sale.getId().toString(), "تم سداد مبلغ: " + saleActualAllocated + " بموجب إيصال: " + receiptNumber, null);

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
    public MachineSale update(UUID id, Map<String, Object> updates) {
        MachineSale sale = getById(id);
        if ("VOIDED".equalsIgnoreCase(sale.getStatus())) {
            throw new BadRequestException("لا يمكن تعديل عقد ملغي");
        }
        if (updates.containsKey("notes")) {
            sale.setNotes((String) updates.get("notes"));
        }
        if (updates.containsKey("paymentPlace")) {
            sale.setPaymentPlace((String) updates.get("paymentPlace"));
        }
        if (updates.containsKey("machineSerial")) {
            String newSerial = ((String) updates.get("machineSerial")).trim().toUpperCase();
            if (!newSerial.equals(sale.getMachineSerial())) {
                Map<String, Object> check = checkSerial(newSerial);
                if (Boolean.FALSE.equals(check.get("available"))) {
                    throw new BadRequestException((String) check.get("message"));
                }
                sale.setMachineSerial(newSerial);
            }
        }
        sale = saleRepository.save(sale);
        auditService.log("UPDATE_SALE", "MachineSale", sale.getId().toString(), "تم تعديل بيانات العقد", null);
        return sale;
    }

    @Transactional
    public MachineSale fullRecalculate(UUID id, Map<String, Object> body) {
        MachineSale sale = getById(id);
        if ("VOIDED".equalsIgnoreCase(sale.getStatus())) {
            throw new BadRequestException("لا يمكن إعادة حساب عقد ملغي");
        }
        if ("COMPLETED".equalsIgnoreCase(sale.getStatus())) {
            throw new BadRequestException("لا يمكن إعادة حساب عقد مكتمل السداد");
        }

        // Check if any installment has been paid
        List<Installment> existingInstallments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(sale.getId());
        boolean hasPaidInstallments = existingInstallments.stream()
                .anyMatch(i -> Boolean.TRUE.equals(i.getIsPaid()) || i.getPaidAmount().compareTo(BigDecimal.ZERO) > 0);
        if (hasPaidInstallments) {
            throw new BadRequestException("لا يمكن إعادة حساب العقد لوجود أقساط مسددة. يرجى التعامل مع الأقساط المسددة أولاً.");
        }

        BigDecimal newTotalPrice = body.containsKey("totalPrice") ? new BigDecimal(body.get("totalPrice").toString()) : sale.getTotalPrice();
        BigDecimal newDownPayment = body.containsKey("downPayment") ? new BigDecimal(body.get("downPayment").toString()) : sale.getDownPayment();
        int newMonths = body.containsKey("months") ? Integer.parseInt(body.get("months").toString()) : (sale.getMonths() != null ? sale.getMonths() : 12);
        LocalDate newFirstDueDate = body.containsKey("firstDueDate") ? LocalDate.parse(body.get("firstDueDate").toString()) : sale.getFirstDueDate();

        if (newTotalPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("إجمالي السعر يجب أن يكون أكبر من الصفر");
        }
        if (newDownPayment.compareTo(newTotalPrice) >= 0) {
            throw new BadRequestException("المقدم يجب أن يكون أقل من إجمالي السعر");
        }

        // Delete old unpaid installments
        installmentRepository.deleteAll(existingInstallments);

        // Update sale
        sale.setTotalPrice(newTotalPrice);
        sale.setDownPayment(newDownPayment);
        sale.setMonths(newMonths);
        sale.setFirstDueDate(newFirstDueDate);

        BigDecimal alreadyPaid = sale.getPaidAmount() != null ? sale.getPaidAmount() : BigDecimal.ZERO;
        sale.setRemainingAmount(newTotalPrice.subtract(alreadyPaid));

        // Regenerate installments for the debt portion
        BigDecimal debtToSchedule = newTotalPrice.subtract(newDownPayment);
        BigDecimal baseInstallment = debtToSchedule.divide(BigDecimal.valueOf(newMonths), 2, java.math.RoundingMode.DOWN);
        BigDecimal totalScheduled = BigDecimal.ZERO;
        LocalDate firstDue = newFirstDueDate != null ? newFirstDueDate : sale.getSaleDate().plusMonths(1);

        List<Installment> newInstallments = new ArrayList<>();
        for (int i = 1; i <= newMonths; i++) {
            BigDecimal instAmount = baseInstallment;
            if (i == newMonths) {
                instAmount = debtToSchedule.subtract(totalScheduled);
            } else {
                totalScheduled = totalScheduled.add(instAmount);
            }
            Installment inst = Installment.builder()
                    .saleId(sale.getId())
                    .installmentNo(i)
                    .dueDate(firstDue.plusMonths(i - 1))
                    .amount(instAmount)
                    .paidAmount(BigDecimal.ZERO)
                    .isPaid(false)
                    .isWaived(false)
                    .branchId(sale.getBranchId())
                    .build();
            newInstallments.add(inst);
        }
        installmentRepository.saveAll(newInstallments);
        sale.setInstallments(newInstallments);

        sale = saleRepository.save(sale);
        auditService.log("RECALCULATE_SALE", "MachineSale", sale.getId().toString(), "تم إعادة جدولة وحساب أقساط العقد", null);
        return sale;
    }

    @Transactional
    public void voidSale(UUID saleId, String reason) {
        MachineSale sale = getById(saleId);
        if (sale.getPaidAmount() != null && sale.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            throw new BadRequestException("لا يمكن إلغاء العقد لوجود مبالغ مسددة عليه. الرجاء تسوية واسترداد الدفعات أولاً.");
        }
        
        sale.setStatus("VOIDED");
        sale.setVoidReason(reason);
        sale.setVoidedAt(Instant.now());

        List<Installment> installments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(saleId);
        for (Installment inst : installments) {
            if (!Boolean.TRUE.equals(inst.getIsPaid())) {
                inst.setIsWaived(true);
                inst.setWaiveReason("عقد ملغي: " + (reason != null ? reason : ""));
                installmentRepository.save(inst);
            }
        }
        saleRepository.save(sale);
        auditService.log("VOID_SALE", "MachineSale", sale.getId().toString(), "تم إلغاء العقد لسبب: " + reason, null);
    }

    @Transactional
    public MachineSale earlySettle(UUID saleId, BigDecimal discountAmount, UUID userId) {
        MachineSale sale = getById(saleId);
        
        String enableEarlySettlement = systemSettingRepository.findById("enableEarlySettlement")
                .map(s -> s.getValue())
                .orElse("false");
        
        if (!"true".equalsIgnoreCase(enableEarlySettlement)) {
            throw new BadRequestException("ميزة السداد المعجل غير مفعلة في إعدادات النظام");
        }

        BigDecimal discount = discountAmount != null ? discountAmount : BigDecimal.ZERO;
        if (discount.compareTo(sale.getRemainingAmount()) > 0) {
            throw new BadRequestException("مبلغ الخصم لا يمكن أن يكون أكبر من المبلغ المتبقي");
        }

        BigDecimal settlementAmount = sale.getRemainingAmount().subtract(discount);
        
        if (settlementAmount.compareTo(BigDecimal.ZERO) > 0) {
            String receiptNumber = generatePaymentReceipt();
            Payment payment = Payment.builder()
                    .receiptNumber(receiptNumber)
                    .saleId(sale.getId())
                    .paymentType("EARLY_SETTLEMENT")
                    .amount(settlementAmount)
                    .paymentPlace(sale.getPaymentPlace())
                    .notes("سداد معجل بخصم " + discount)
                    .paidAt(Instant.now())
                    .branchId(sale.getBranchId())
                    .createdByUserId(userId)
                    .build();
            paymentRepository.save(payment);
            sale.setPaidAmount(sale.getPaidAmount().add(settlementAmount));
            sale.setRemainingAmount(BigDecimal.ZERO);
        }

        List<Installment> installments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(saleId);
        for (Installment inst : installments) {
            if (!Boolean.TRUE.equals(inst.getIsPaid())) {
                inst.setIsWaived(true);
                inst.setWaiveReason("سداد معجل");
                installmentRepository.save(inst);
            }
        }
        
        sale.setStatus("COMPLETED");
        saleRepository.save(sale);
        
        auditService.log("EARLY_SETTLE", "MachineSale", sale.getId().toString(), "تم السداد المعجل للعقد بخصم: " + discount, null);
        return sale;
    }

    private String generateReceiptNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long nextVal = receiptSequenceService.getNextSaleReceiptNumber();
        return String.format("SAL-%s-%05d", datePart, nextVal);
    }

    private String generatePaymentReceipt() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long nextVal = receiptSequenceService.getNextPaymentReceiptNumber();
        return String.format("PAY-%s-%05d", datePart, nextVal);
    }
}