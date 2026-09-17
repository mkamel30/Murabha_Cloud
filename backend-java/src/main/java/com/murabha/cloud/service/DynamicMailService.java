package com.murabha.cloud.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.murabha.cloud.dto.MailSettingsDto;
import com.murabha.cloud.entity.InstallmentRequest;
import com.murabha.cloud.entity.SystemSetting;
import com.murabha.cloud.repository.SystemSettingRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DynamicMailService {

    private final SystemSettingRepository settingRepository;
    private final ObjectMapper objectMapper;

    public MailSettingsDto getMailSettings() {
        return settingRepository.findById("mail_config")
                .map(setting -> {
                    try {
                        MailSettingsDto dto = objectMapper.readValue(setting.getValue(), MailSettingsDto.class);
                        // Mask password for security
                        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
                            dto.setPassword("********");
                        }
                        // Add templates
                        settingRepository.findById("mail_template_subject").ifPresent(s -> dto.setTemplateSubject(s.getValue()));
                        settingRepository.findById("mail_template_body").ifPresent(b -> dto.setTemplateBody(b.getValue()));
                        return dto;
                    } catch (Exception e) {
                        log.error("Failed to parse mail_config: {}", e.getMessage());
                        return defaultSettings();
                    }
                })
                .orElseGet(this::defaultSettings);
    }

    public void saveMailSettings(MailSettingsDto dto) {
        try {
            MailSettingsDto toSave = dto;
            if ("********".equals(dto.getPassword())) {
                // Keep existing password
                MailSettingsDto current = getRawSettings();
                if (current != null) {
                    toSave.setPassword(current.getPassword());
                }
            }

            settingRepository.save(SystemSetting.builder()
                    .key("mail_config")
                    .value(objectMapper.writeValueAsString(toSave))
                    .description("إعدادات خادم البريد الإلكتروني SMTP")
                    .updatedAt(Instant.now())
                    .build());

            if (dto.getTemplateSubject() != null) {
                settingRepository.save(SystemSetting.builder()
                        .key("mail_template_subject")
                        .value(dto.getTemplateSubject())
                        .description("قالب عنوان بريد طلبات التقسيط")
                        .updatedAt(Instant.now())
                        .build());
            }

            if (dto.getTemplateBody() != null) {
                settingRepository.save(SystemSetting.builder()
                        .key("mail_template_body")
                        .value(dto.getTemplateBody())
                        .description("قالب نص بريد طلبات التقسيط (HTML)")
                        .updatedAt(Instant.now())
                        .build());
            }

            log.info("Updated mail configuration successfully.");
        } catch (Exception e) {
            log.error("Failed to save mail settings: {}", e.getMessage());
            throw new RuntimeException("فشل حفظ إعدادات البريد: " + e.getMessage());
        }
    }

    public void sendTestEmail(MailSettingsDto testDto, String recipient) {
        try {
            JavaMailSenderImpl sender = buildSender(testDto);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            String fromEmail = testDto.getFromEmail() != null && !testDto.getFromEmail().isBlank()
                    ? testDto.getFromEmail() : testDto.getUsername();
            String fromName = testDto.getFromName() != null && !testDto.getFromName().isBlank()
                    ? testDto.getFromName() : "مرابحة كلاود (Murabha Cloud)";

            helper.setFrom(fromEmail, fromName);
            helper.setTo(recipient);
            helper.setSubject("اختبار إعدادات البريد الإلكتروني - مرابحة كلاود");

            String html = """
                <div dir="rtl" style="font-family: Arial, sans-serif; background: #f8fafc; padding: 25px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #0A2472; margin-top: 0;">مرابحة كلاود | تجربة إعدادات البريد</h2>
                        <p style="color: #334155; font-size: 15px;">تهانينا! لقد تم الاتصال بخادم البريد الإلكتروني وإرسال هذه الرسالة التجريبية بنجاح.</p>
                        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 13px; color: #475569; margin: 20px 0;">
                            <b>المزود:</b> %s<br/>
                            <b>الخادم:</b> %s:%d<br/>
                            <b>تاريخ الإرسال:</b> %s
                        </div>
                        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">نظام مرابحة كلاود للتقسيط والمبيعات.</p>
                    </div>
                </div>
                """.formatted(testDto.getProvider(), testDto.getHost(), testDto.getPort(), Instant.now().toString());

            helper.setText(html, true);
            sender.send(message);
            log.info("Test email sent successfully to: {}", recipient);
        } catch (Exception e) {
            log.error("Failed to send test email: {}", e.getMessage());
            throw new RuntimeException("فشل إرسال بريد الاختبار: " + e.getMessage());
        }
    }

    @Async
    public void sendInstallmentRequestAlert(InstallmentRequest req, List<String> recipientEmails, String actionTitle) {
        if (recipientEmails == null || recipientEmails.isEmpty()) {
            return;
        }

        try {
            MailSettingsDto config = getRawSettings();
            if (config == null || config.getHost() == null || config.getHost().isBlank()) {
                log.warn("Email alerting skipped: SMTP host is not configured.");
                return;
            }

            JavaMailSenderImpl sender = buildSender(config);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            String fromEmail = config.getFromEmail() != null && !config.getFromEmail().isBlank()
                    ? config.getFromEmail() : config.getUsername();
            String fromName = config.getFromName() != null && !config.getFromName().isBlank()
                    ? config.getFromName() : "مرابحة كلاود";

            helper.setFrom(fromEmail, fromName);
            for (String email : recipientEmails) {
                if (email != null && email.contains("@")) {
                    helper.addTo(email);
                }
            }

            String subject = getMailSettings().getTemplateSubject();
            if (subject == null || subject.isBlank()) {
                subject = "طلب تقسيط جديد بحاجة للاعتماد: {{requestNumber}} - {{customerName}}";
            }
            subject = replaceVariables(subject, req, actionTitle);
            helper.setSubject(subject);

            String bodyTemplate = getMailSettings().getTemplateBody();
            if (bodyTemplate == null || bodyTemplate.isBlank()) {
                bodyTemplate = defaultHtmlTemplate();
            }
            String finalHtml = replaceVariables(bodyTemplate, req, actionTitle);
            helper.setText(finalHtml, true);

            sender.send(message);
            log.info("Sent installment request notification email to: {}", recipientEmails);
        } catch (Exception e) {
            log.error("Error sending installment alert email: {}", e.getMessage());
        }
    }

    private String replaceVariables(String text, InstallmentRequest req, String actionTitle) {
        String customerName = req.getCustomer() != null ? req.getCustomer().getName() : "غير محدد";
        String customerPhone = req.getCustomer() != null ? req.getCustomer().getPhone() : "-";
        String branchName = req.getBranch() != null ? req.getBranch().getName() : "الفرع";

        return text
                .replace("{{requestNumber}}", req.getRequestNumber())
                .replace("{{actionTitle}}", actionTitle != null ? actionTitle : "طلب جديد")
                .replace("{{customerName}}", customerName)
                .replace("{{customerPhone}}", customerPhone != null ? customerPhone : "-")
                .replace("{{machineSerial}}", req.getMachineSerial())
                .replace("{{totalPrice}}", req.getTotalPrice().toString())
                .replace("{{downPayment}}", req.getDownPayment().toString())
                .replace("{{months}}", String.valueOf(req.getMonths()))
                .replace("{{branchName}}", branchName)
                .replace("{{createdByName}}", req.getRequestedByUserName() != null ? req.getRequestedByUserName() : "خدمة العملاء")
                .replace("{{status}}", req.getStatus())
                .replace("{{actionUrl}}", "http://localhost:2436/installment-requests");
    }

    private JavaMailSenderImpl buildSender(MailSettingsDto dto) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        
        if ("GMAIL".equalsIgnoreCase(dto.getProvider())) {
            sender.setHost("smtp.gmail.com");
            sender.setPort(587);
        } else if ("OFFICE365".equalsIgnoreCase(dto.getProvider())) {
            sender.setHost("smtp.office365.com");
            sender.setPort(587);
        } else {
            sender.setHost(dto.getHost());
            sender.setPort(dto.getPort() != null ? dto.getPort() : 587);
        }

        sender.setUsername(dto.getUsername());
        sender.setPassword(dto.getPassword());
        sender.setDefaultEncoding("UTF-8");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", String.valueOf(Boolean.TRUE.equals(dto.getUseTls()) || "GMAIL".equalsIgnoreCase(dto.getProvider()) || "OFFICE365".equalsIgnoreCase(dto.getProvider())));
        props.put("mail.smtp.ssl.enable", String.valueOf(Boolean.TRUE.equals(dto.getUseSsl())));
        props.put("mail.smtp.connectiontimeout", "7000");
        props.put("mail.smtp.timeout", "7000");
        props.put("mail.smtp.writetimeout", "7000");

        return sender;
    }

    private MailSettingsDto getRawSettings() {
        return settingRepository.findById("mail_config")
                .map(setting -> {
                    try {
                        return objectMapper.readValue(setting.getValue(), MailSettingsDto.class);
                    } catch (Exception e) {
                        return null;
                    }
                }).orElse(null);
    }

    private MailSettingsDto defaultSettings() {
        return MailSettingsDto.builder()
                .provider("GMAIL")
                .host("smtp.gmail.com")
                .port(587)
                .useTls(true)
                .useSsl(false)
                .fromName("مرابحة كلاود (Murabha Cloud)")
                .templateSubject("طلب تقسيط بحاجة للمراجعة: {{requestNumber}} - {{customerName}}")
                .templateBody(defaultHtmlTemplate())
                .build();
    }

    private String defaultHtmlTemplate() {
        return """
            <div dir="rtl" style="font-family: Cairo, Tahoma, Arial, sans-serif; background-color: #f8fafc; padding: 25px; color: #1e293b;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #0A2472 0%, #001C55 100%); padding: 25px; color: #ffffff; text-align: center;">
                  <h1 style="margin: 0; font-size: 20px; font-weight: bold;">مرابحة كلاود | إشعار طلب تقسيط</h1>
                  <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 13px;">{{actionTitle}}</p>
                </div>
                <div style="padding: 25px;">
                  <p style="font-size: 15px; margin-top: 0;">مرحباً،</p>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                    تم تسجيل طلب تقسيط جديد بالفرع <b>({{branchName}})</b> بواسطة <b>{{createdByName}}</b> وهو بانتظار مراجعتكم واعتمادكم.
                  </p>
                  
                  <div style="background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 14px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">رقم الطلب:</td>
                        <td style="padding: 6px 0; font-weight: bold; color: #0A2472;">{{requestNumber}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">العميل:</td>
                        <td style="padding: 6px 0; font-weight: bold;">{{customerName}} ({{customerPhone}})</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">رقم الماكينة:</td>
                        <td style="padding: 6px 0; font-weight: bold; font-family: monospace;">{{machineSerial}}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">إجمالي السعر:</td>
                        <td style="padding: 6px 0; font-weight: bold; color: #059669;">{{totalPrice}} ج.م</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">المقدم المقترح:</td>
                        <td style="padding: 6px 0; font-weight: bold;">{{downPayment}} ج.م</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">مدة التقسيط:</td>
                        <td style="padding: 6px 0; font-weight: bold;">{{months}} شهر</td>
                      </tr>
                    </table>
                  </div>

                  <div style="text-align: center; margin: 30px 0 15px 0;">
                    <a href="{{actionUrl}}" style="background: #0A2472; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                      مراجعة واعتماد الطلب الآن
                    </a>
                  </div>
                </div>
                <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                  نظام مرابحة كلاود لإدارة المبيعات والأقساط الذكية
                </div>
              </div>
            </div>
            """;
    }
}