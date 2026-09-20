package com.murabha.cloud.controller;

import com.murabha.cloud.dto.MailSettingsDto;
import com.murabha.cloud.dto.WorkflowSettingsDto;
import com.murabha.cloud.entity.SystemSetting;
import com.murabha.cloud.repository.SystemSettingRepository;
import com.murabha.cloud.service.DynamicMailService;
import com.murabha.cloud.service.InstallmentRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SystemSettingRepository settingRepository;
    private final DynamicMailService mailService;
    private final InstallmentRequestService installmentRequestService;

    @GetMapping("/mail")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
    public ResponseEntity<MailSettingsDto> getMailSettings() {
        return ResponseEntity.ok(mailService.getMailSettings());
    }

    @PutMapping("/mail")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
    public ResponseEntity<Map<String, Object>> saveMailSettings(@RequestBody MailSettingsDto dto) {
        mailService.saveMailSettings(dto);
        return ResponseEntity.ok(Map.of("message", "تم حفظ إعدادات البريد الإلكتروني بنجاح"));
    }

    @PostMapping("/mail/test")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
    public ResponseEntity<Map<String, Object>> testMail(@RequestBody MailSettingsDto dto) {
        String recipient = dto.getTestRecipient() != null && !dto.getTestRecipient().isBlank()
                ? dto.getTestRecipient() : dto.getUsername();
        mailService.sendTestEmail(dto, recipient);
        return ResponseEntity.ok(Map.of("message", "تم إرسال بريد الاختبار بنجاح إلى: " + recipient));
    }

    @GetMapping("/workflow")
    public ResponseEntity<WorkflowSettingsDto> getWorkflowSettings() {
        return ResponseEntity.ok(installmentRequestService.getWorkflowSettings());
    }

    @PutMapping("/workflow")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
    public ResponseEntity<Map<String, Object>> saveWorkflowSettings(@RequestBody WorkflowSettingsDto dto) {
        installmentRequestService.saveWorkflowSettings(dto);
        return ResponseEntity.ok(Map.of("message", "تم حفظ إعدادات مسارات الموافقة بنجاح"));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        List<SystemSetting> settings = settingRepository.findAll();
        Map<String, Object> map = new HashMap<>();
        for (SystemSetting s : settings) {
            // Never expose sensitive configuration keys to unprivileged users in general settings
            if ("mail_config".equalsIgnoreCase(s.getKey()) || s.getKey().toLowerCase().contains("password") || s.getKey().toLowerCase().contains("secret")) {
                continue;
            }
            if ("enableCashSales".equals(s.getKey())) {
                map.put(s.getKey(), Boolean.parseBoolean(s.getValue()));
            } else if ("paymentPlaces".equals(s.getKey())) {
                try {
                    map.put(s.getKey(), new com.fasterxml.jackson.databind.ObjectMapper().readValue(s.getValue(), List.class));
                } catch (Exception e) {
                    map.put(s.getKey(), List.of("Damen", "البريد", "البنك"));
                }
            } else if ("enableEarlySettlement".equals(s.getKey()) || "requireKycAttachments".equals(s.getKey()) || "requireGuarantor".equals(s.getKey())) {
                map.put(s.getKey(), Boolean.parseBoolean(s.getValue()));
            } else {
                map.put(s.getKey(), s.getValue());
            }
        }
        if (!map.containsKey("enableCashSales")) {
            map.put("enableCashSales", false);
        }
        if (!map.containsKey("paymentPlaces")) {
            map.put("paymentPlaces", List.of("Damen", "البريد", "البنك"));
        }
        return ResponseEntity.ok(map);
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String key, @RequestBody Map<String, Object> body) {
        Object val = body.get("value");
        String stringVal = val != null ? val.toString() : "";
        SystemSetting setting = settingRepository.findById(key)
                .orElse(SystemSetting.builder().key(key).build());
        setting.setValue(stringVal);
        setting.setUpdatedAt(Instant.now());
        settingRepository.save(setting);

        return ResponseEntity.ok(Map.of("success", true, "key", key, "value", val));
    }
}