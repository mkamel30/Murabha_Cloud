package com.murabha.cloud.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.murabha.cloud.dto.ApprovalActionRequest;
import com.murabha.cloud.dto.InstallmentRequestCreateDto;
import com.murabha.cloud.dto.SaleCreateRequest;
import com.murabha.cloud.dto.WorkflowSettingsDto;
import com.murabha.cloud.entity.*;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.InstallmentRequestRepository;
import com.murabha.cloud.repository.SystemSettingRepository;
import com.murabha.cloud.repository.UserRepository;
import com.murabha.cloud.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class InstallmentRequestService {

    private final InstallmentRequestRepository requestRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final SystemSettingRepository settingRepository;
    private final SaleService saleService;
    private final DynamicMailService mailService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public WorkflowSettingsDto getWorkflowSettings() {
        return settingRepository.findById("workflow_approval_config")
                .map(s -> {
                    try {
                        return objectMapper.readValue(s.getValue(), WorkflowSettingsDto.class);
                    } catch (Exception e) {
                        return new WorkflowSettingsDto();
                    }
                }).orElseGet(WorkflowSettingsDto::new);
    }

    public void saveWorkflowSettings(WorkflowSettingsDto dto) {
        try {
            settingRepository.save(SystemSetting.builder()
                    .key("workflow_approval_config")
                    .value(objectMapper.writeValueAsString(dto))
                    .description("إعدادات مسارات وشروط موافقة طلبات التقسيط")
                    .updatedAt(Instant.now())
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("فشل حفظ إعدادات مسارات الموافقة: " + e.getMessage());
        }
    }

    @Transactional
    public InstallmentRequest create(InstallmentRequestCreateDto dto, UserPrincipal requester) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("العميل غير موجود"));

        UUID branchId = requester.getBranchId() != null ? requester.getBranchId() : customer.getBranchId();
        BigDecimal downPayment = dto.getDownPayment() != null ? dto.getDownPayment() : BigDecimal.ZERO;
        BigDecimal debt = dto.getTotalPrice().subtract(downPayment);
        BigDecimal instAmount = dto.getInstallmentAmount();
        if (instAmount == null || instAmount.compareTo(BigDecimal.ZERO) <= 0) {
            instAmount = debt.divide(BigDecimal.valueOf(dto.getMonths()), 2, RoundingMode.HALF_UP);
        }

        String reqNumber = "REQ-" + System.currentTimeMillis();

        InstallmentRequest req = InstallmentRequest.builder()
                .requestNumber(reqNumber)
                .customerId(customer.getId())
                .customer(customer)
                .machineSerial(dto.getMachineSerial().trim().toUpperCase())
                .totalPrice(dto.getTotalPrice())
                .downPayment(downPayment)
                .months(dto.getMonths())
                .installmentAmount(instAmount)
                .paymentPlace(dto.getPaymentPlace() != null ? dto.getPaymentPlace() : "Damen")
                .notes(dto.getNotes())
                .status("PENDING_SUPERVISOR")
                .branchId(branchId)
                .requestedByUserId(requester.getId())
                .requestedByUserName(requester.getName())
                .approvalHistory("[]")
                .build();

        req = requestRepository.save(req);

        // 1. In-app notification for supervisor
        notificationService.createNotificationForRole(
                branchId,
                UserRole.BRANCH_SUPERVISOR.name(),
                "طلب تقسيط جديد",
                "تم تسجيل طلب تقسيط جديد رقم " + reqNumber + " للعميل " + customer.getName() + " وبانتظار المراجعة.",
                "/installment-requests"
        );

        // 2. Dynamic Email alert to branch supervisors & manager
        List<User> recipients = userRepository.findByBranchId(branchId);
        List<String> emails = new ArrayList<>();
        for (User u : recipients) {
            if ((u.getRole() == UserRole.BRANCH_SUPERVISOR || u.getRole() == UserRole.BRANCH_MANAGER) 
                    && Boolean.TRUE.equals(u.getIsActive()) && u.getEmail() != null) {
                emails.add(u.getEmail());
            }
        }
        mailService.sendInstallmentRequestAlert(req, emails, "طلب تقسيط جديد بحاجة للمراجعة والاعتماد");

        return req;
    }

    @Transactional(readOnly = true)
    public List<InstallmentRequest> getAll(UUID branchId, String status) {
        return requestRepository.findWithFilters(branchId, status);
    }

    @Transactional(readOnly = true)
    public InstallmentRequest getById(UUID id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("طلب التقسيط غير موجود"));
    }

    @Transactional
    public InstallmentRequest approve(UUID id, ApprovalActionRequest action, UserPrincipal reviewer) {
        InstallmentRequest req = getById(id);

        if (!"PENDING_SUPERVISOR".equals(req.getStatus()) && !"PENDING_MANAGER".equals(req.getStatus())) {
            throw new BadRequestException("لا يمكن اعتماد هذا الطلب في حالته الحالية: " + req.getStatus());
        }

        WorkflowSettingsDto config = getWorkflowSettings();
        boolean requiresManager = Boolean.TRUE.equals(config.getRequireBranchManager());
        if ("THRESHOLD".equalsIgnoreCase(config.getMode())) {
            requiresManager = req.getTotalPrice().compareTo(config.getThresholdAmount()) >= 0;
        } else if ("ONE_LEVEL".equalsIgnoreCase(config.getMode())) {
            requiresManager = false;
        }

        appendHistory(req, reviewer, "APPROVED", action.getNotes());

        if ("PENDING_SUPERVISOR".equals(req.getStatus())) {
            if (requiresManager) {
                req.setStatus("PENDING_MANAGER");
                // In-app notification for manager
                notificationService.createNotificationForRole(
                        req.getBranchId(),
                        UserRole.BRANCH_MANAGER.name(),
                        "موافقة المشرف - مطلوب اعتماد المدير",
                        "تمت مراجعة الطلب " + req.getRequestNumber() + " من المشرف وهو بانتظار اعتماد مدير الفرع.",
                        "/installment-requests"
                );
                // Email branch manager
                List<String> managerEmails = userRepository.findByBranchId(req.getBranchId()).stream()
                        .filter(u -> u.getRole() == UserRole.BRANCH_MANAGER && Boolean.TRUE.equals(u.getIsActive()) && u.getEmail() != null)
                        .map(User::getEmail)
                        .toList();
                mailService.sendInstallmentRequestAlert(req, managerEmails, "مطلوب اعتماد مدير الفرع لطلب تقسيط");
            } else {
                req.setStatus("APPROVED");
                notifyApproved(req);
            }
        } else if ("PENDING_MANAGER".equals(req.getStatus())) {
            req.setStatus("APPROVED");
            notifyApproved(req);
        }

        return requestRepository.save(req);
    }

    @Transactional
    public InstallmentRequest reject(UUID id, ApprovalActionRequest action, UserPrincipal reviewer) {
        InstallmentRequest req = getById(id);
        if ("APPROVED".equals(req.getStatus()) || "CONVERTED_TO_SALE".equals(req.getStatus())) {
            throw new BadRequestException("لا يمكن رفض طلب تم اعتماده أو تحويله لعقد بيع");
        }

        if (action.getReason() == null || action.getReason().isBlank()) {
            throw new BadRequestException("يجب كتابة سبب الرفض");
        }

        req.setStatus("REJECTED");
        req.setRejectionReason(action.getReason().trim());
        appendHistory(req, reviewer, "REJECTED", action.getReason());

        // Notify requester
        notificationService.createNotificationForUser(
                req.getRequestedByUserId(),
                "تم رفض طلب التقسيط",
                "تم رفض طلب التقسيط رقم " + req.getRequestNumber() + ". السبب: " + action.getReason(),
                "/installment-requests"
        );

        return requestRepository.save(req);
    }

    @Transactional
    public MachineSale convertToSale(UUID id, ApprovalActionRequest action, UserPrincipal user) {
        InstallmentRequest req = getById(id);
        if (!"APPROVED".equals(req.getStatus())) {
            throw new BadRequestException("يجب أن يكون الطلب معتمداً رسمياً لتحويله لعقد بيع");
        }

        String receipt = action.getDownPaymentReceipt();
        if (receipt == null || receipt.isBlank()) {
            throw new BadRequestException("يجب إدخال رقم إيصال الدفعة المقدمة لتأكيد العقد");
        }

        // Create official MachineSale
        SaleCreateRequest saleReq = SaleCreateRequest.builder()
                .customerId(req.getCustomerId())
                .machineSerial(req.getMachineSerial())
                .saleType("INSTALLMENT")
                .totalPrice(req.getTotalPrice())
                .downPayment(req.getDownPayment())
                .downPaymentReceipt(receipt.trim())
                .paymentPlace(req.getPaymentPlace())
                .notes(req.getNotes())
                .saleDate(LocalDate.now())
                .firstDueDate(LocalDate.now().plusMonths(1))
                .months(req.getMonths())
                .installmentAmount(req.getInstallmentAmount())
                .build();

        MachineSale sale = saleService.create(saleReq, req.getBranchId(), user.getId());

        req.setStatus("CONVERTED_TO_SALE");
        req.setSaleId(sale.getId());
        req.setDownPaymentReceipt(receipt.trim());
        appendHistory(req, user, "CONVERTED_TO_SALE", "تم تسجيل إيصال المقدم رقم: " + receipt + " وتوليد العقد رقم: " + sale.getReceiptNumber());
        requestRepository.save(req);

        return sale;
    }

    private void notifyApproved(InstallmentRequest req) {
        notificationService.createNotificationForUser(
                req.getRequestedByUserId(),
                "تم اعتماد طلب التقسيط بنجاح!",
                "تمت الموافقة النهائية على طلب التقسيط رقم " + req.getRequestNumber() + ". يرجى إدخال إيصال المقدم لتأكيد العقد.",
                "/installment-requests"
        );
    }

    private void appendHistory(InstallmentRequest req, UserPrincipal actor, String action, String notes) {
        try {
            List<Map<String, Object>> history = new ArrayList<>();
            if (req.getApprovalHistory() != null && !req.getApprovalHistory().isBlank()) {
                history = objectMapper.readValue(req.getApprovalHistory(), new TypeReference<>() {});
            }

            Map<String, Object> entry = new HashMap<>();
            entry.put("action", action);
            entry.put("actorId", actor.getId().toString());
            entry.put("actorName", actor.getName());
            entry.put("actorRole", actor.getRole().name());
            entry.put("notes", notes);
            entry.put("timestamp", Instant.now().toString());

            history.add(entry);
            req.setApprovalHistory(objectMapper.writeValueAsString(history));
        } catch (Exception e) {
            log.error("Failed to append history: {}", e.getMessage());
        }
    }
}