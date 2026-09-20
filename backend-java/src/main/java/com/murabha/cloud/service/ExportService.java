package com.murabha.cloud.service;

import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.repository.InstallmentRepository;
import com.murabha.cloud.repository.MachineSaleRepository;
import com.murabha.cloud.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final MachineSaleRepository saleRepository;
    private final PaymentRepository paymentRepository;
    private final InstallmentRepository installmentRepository;

    public byte[] exportSalesExcel(UUID branchId) throws IOException {
        List<MachineSale> sales = saleRepository.findSalesForReport(branchId, null, null, null);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("المبيعات");
            Row header = sheet.createRow(0);
            String[] columns = {"رقم الإيصال", "الماكينة", "نوع البيع", "إجمالي السعر", "المسدد", "المتبقي", "الحالة", "تاريخ البيع"};
            for (int i = 0; i < columns.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (MachineSale s : sales) {
                Row r = sheet.createRow(rowIdx++);
                r.createCell(0).setCellValue(s.getReceiptNumber());
                r.createCell(1).setCellValue(s.getMachineSerial());
                r.createCell(2).setCellValue(s.getSaleType());
                r.createCell(3).setCellValue(s.getTotalPrice().doubleValue());
                r.createCell(4).setCellValue(s.getPaidAmount().doubleValue());
                r.createCell(5).setCellValue(s.getRemainingAmount().doubleValue());
                r.createCell(6).setCellValue(s.getStatus());
                r.createCell(7).setCellValue(s.getSaleDate().toString());
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportCollectionsExcel(UUID branchId) throws IOException {
        List<Payment> payments = paymentRepository.findPaymentsWithFilters(branchId, null, null, null);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("التحصيلات");
            Row header = sheet.createRow(0);
            String[] columns = {"رقم الإيصال", "المبلغ", "نوع الدفع", "مكان الدفع", "تاريخ السداد"};
            for (int i = 0; i < columns.length; i++) {
                header.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (Payment p : payments) {
                Row r = sheet.createRow(rowIdx++);
                r.createCell(0).setCellValue(p.getReceiptNumber());
                r.createCell(1).setCellValue(p.getAmount().doubleValue());
                r.createCell(2).setCellValue(p.getPaymentType());
                r.createCell(3).setCellValue(p.getPaymentPlace() != null ? p.getPaymentPlace() : "");
                r.createCell(4).setCellValue(p.getPaidAt().toString());
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportOverdueExcel(UUID branchId) throws IOException {
        List<Installment> overdue = installmentRepository.findOverdueInstallments(branchId, LocalDate.now());
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("المتأخرات");
            Row header = sheet.createRow(0);
            String[] columns = {"رقم القسط", "تاريخ الاستحقاق", "المبلغ", "المسدد", "المتبقي"};
            for (int i = 0; i < columns.length; i++) {
                header.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (Installment inst : overdue) {
                Row r = sheet.createRow(rowIdx++);
                r.createCell(0).setCellValue(inst.getInstallmentNo());
                r.createCell(1).setCellValue(inst.getDueDate().toString());
                r.createCell(2).setCellValue(inst.getAmount().doubleValue());
                r.createCell(3).setCellValue(inst.getPaidAmount().doubleValue());
                r.createCell(4).setCellValue(inst.getAmount().subtract(inst.getPaidAmount()).doubleValue());
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private final com.murabha.cloud.repository.CustomerRepository customerRepository;
    private final com.murabha.cloud.repository.BranchRepository branchRepository;

    private String getLogoDataUri() {
        try (var is = getClass().getResourceAsStream("/static/logo.png")) {
            if (is != null) {
                byte[] bytes = is.readAllBytes();
                return "data:image/png;base64," + java.util.Base64.getEncoder().encodeToString(bytes);
            }
        } catch (Exception ignored) {}
        return "/logo.png";
    }

    private String formatMoney(java.math.BigDecimal amount) {
        if (amount == null) return "0.00 ج.م";
        return String.format("%,.2f ج.م", amount);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    public String generateReceiptHtml(Payment payment) {
        String logoUri = getLogoDataUri();
        String branchName = "الفرع الرئيسي";
        if (payment.getBranchId() != null) {
            branchName = branchRepository.findById(payment.getBranchId())
                    .map(com.murabha.cloud.entity.Branch::getName)
                    .orElse("الفرع الرئيسي");
        }

        return "<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='UTF-8'>" +
                "<title>إيصال سداد - " + escape(payment.getReceiptNumber()) + "</title>" +
                "<style>" +
                "@page { size: A5 landscape; margin: 10mm; }" +
                "* { margin: 0; padding: 0; box-sizing: border-box; }" +
                "body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #fff; padding: 20px; color: #1e293b; }" +
                ".receipt-card { max-width: 600px; margin: auto; border: 2px solid #0A2472; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }" +
                ".header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }" +
                ".logo { max-height: 45px; }" +
                ".company-title { text-align: left; font-size: 11pt; color: #0A2472; font-weight: 800; }" +
                ".branch-tag { font-size: 9pt; color: #64748b; }" +
                ".title { text-align: center; font-size: 14pt; font-weight: bold; color: #0A2472; margin-bottom: 16px; background: #eff6ff; padding: 8px; border-radius: 8px; }" +
                ".grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; font-size: 10pt; margin-bottom: 20px; }" +
                ".row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }" +
                ".label { color: #64748b; font-weight: 600; }" +
                ".val { font-weight: 700; color: #0f172a; }" +
                ".amount-highlight { font-size: 16pt; font-weight: 900; color: #059669; }" +
                ".signatures { display: flex; justify-content: space-between; margin-top: 30px; font-size: 9pt; }" +
                ".sig-box { width: 40%; text-align: center; }" +
                ".sig-line { margin-top: 35px; border-top: 1px dashed #475569; padding-top: 4px; color: #64748b; }" +
                ".footer { text-align: center; margin-top: 20px; font-size: 8.5pt; color: #94a3b8; }" +
                "@media print { body { padding: 0; } .receipt-card { border: 2px solid #0A2472; box-shadow: none; } }" +
                "</style></head>" +
                "<body>" +
                "<div class='receipt-card'>" +
                "  <div class='header'>" +
                "    <img src='" + logoUri + "' alt='Logo' class='logo' />" +
                "    <div class='company-title'>مرابحة كلاود لتقسيط الماكينات<div class='branch-tag'>" + escape(branchName) + "</div></div>" +
                "  </div>" +
                "  <div class='title'>إيصال استلام نقدية رسمي</div>" +
                "  <div class='grid'>" +
                "    <div class='row'><span class='label'>رقم الإيصال:</span><span class='val' style='font-family:monospace;'>" + escape(payment.getReceiptNumber()) + "</span></div>" +
                "    <div class='row'><span class='label'>تاريخ السداد:</span><span class='val'>" + (payment.getPaidAt() != null ? payment.getPaidAt().toString() : "") + "</span></div>" +
                "    <div class='row'><span class='label'>المبلغ المستلم:</span><span class='val amount-highlight'>" + formatMoney(payment.getAmount()) + "</span></div>" +
                "    <div class='row'><span class='label'>طريقة / مكان السداد:</span><span class='val'>" + escape(payment.getPaymentPlace() != null ? payment.getPaymentPlace() : "Damen") + "</span></div>" +
                "  </div>" +
                "  <div class='signatures'>" +
                "    <div class='sig-box'>توقيع المودع / العميل<div class='sig-line'>التوقيع</div></div>" +
                "    <div class='sig-box'>توقيع أمين الخزينة / المحصل<div class='sig-line'>الختم والتوقيع</div></div>" +
                "  </div>" +
                "  <div class='footer'>شكراً لثقتكم بنا — يعتبر هذا الإيصال لاغياً في حال وجود أي كشط أو تعديل</div>" +
                "</div>" +
                "<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>" +
                "</body></html>";
    }

    public String generateContractHtml(MachineSale sale) {
        String logoUri = getLogoDataUri();
        com.murabha.cloud.entity.Customer customer = sale.getCustomer();
        if (customer == null && sale.getCustomerId() != null) {
            customer = customerRepository.findById(sale.getCustomerId()).orElse(null);
        }

        String branchName = "الفرع الرئيسي";
        if (sale.getBranchId() != null) {
            branchName = branchRepository.findById(sale.getBranchId())
                    .map(com.murabha.cloud.entity.Branch::getName)
                    .orElse("الفرع الرئيسي");
        }

        List<Installment> installments = installmentRepository.findBySaleIdOrderByInstallmentNoAsc(sale.getId());
        String isInstallment = "INSTALLMENT".equalsIgnoreCase(sale.getSaleType()) ? "عقد بيع بالتقسيط والمرابحة" : "عقد بيع قطعي بالدفعة الكاملة";

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='UTF-8'>");
        sb.append("<title>عقد بيع - ").append(escape(sale.getReceiptNumber())).append("</title>");
        sb.append("<style>");
        sb.append("@page { size: A4; margin: 8mm; }");
        sb.append("* { margin: 0; padding: 0; box-sizing: border-box; }");
        sb.append("body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 8.5pt; line-height: 1.35; background: #fff; color: #1e293b; }");
        sb.append(".contract-page { width: 100%; max-width: 210mm; margin: 0 auto; padding: 6mm; display: flex; flex-direction: column; }");
        sb.append("@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .contract-page { padding: 0; } }");
        sb.append(".contract-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 2px solid #0A2472; margin-bottom: 8px; }");
        sb.append(".logo { max-height: 50px; max-width: 140px; object-fit: contain; }");
        sb.append(".company-info { text-align: left; }");
        sb.append(".company-name { font-size: 11pt; font-weight: 800; color: #0A2472; }");
        sb.append(".branch-name { font-size: 8.5pt; color: #64748b; }");
        sb.append(".contract-title { text-align: center; font-size: 13pt; font-weight: 800; color: #0A2472; margin-bottom: 8px; padding: 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; }");
        sb.append(".section { margin-bottom: 8px; }");
        sb.append(".section-title { font-size: 9.5pt; font-weight: bold; color: #0A2472; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px solid #cbd5e1; }");
        sb.append(".info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 16px; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 8.5pt; }");
        sb.append(".info-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dotted #e2e8f0; }");
        sb.append(".info-row:last-child { border-bottom: none; }");
        sb.append(".label { color: #64748b; font-weight: 600; }");
        sb.append(".val { font-weight: 700; color: #0f172a; }");
        sb.append(".amount { font-weight: 800; color: #0A2472; }");
        sb.append(".installments-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 6px 0; }");
        sb.append(".inst-card { padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; background: #fff; font-size: 8pt; }");
        sb.append(".inst-card.paid { background: #f0fdf4; border-color: #86efac; }");
        sb.append(".inst-num { font-weight: bold; color: #0A2472; }");
        sb.append(".inst-amount { font-weight: 800; font-size: 9pt; color: #059669; }");
        sb.append(".inst-date { color: #64748b; font-size: 7.5pt; }");
        sb.append(".totals { margin-top: 6px; padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; }");
        sb.append(".total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 8.5pt; }");
        sb.append(".total-row.final { border-top: 2px solid #0A2472; font-size: 11pt; font-weight: 800; color: #0A2472; padding-top: 4px; margin-top: 4px; }");
        sb.append(".declaration { margin-top: 8px; padding: 8px 10px; background: #f8fafc; border-right: 3px solid #0A2472; border-radius: 4px; font-size: 8pt; line-height: 1.5; color: #334155; }");
        sb.append(".signatures { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 4px; }");
        sb.append(".sig-box { width: 30%; text-align: center; font-size: 8.5pt; font-weight: 700; color: #334155; }");
        sb.append(".sig-line { margin-top: 35px; border-top: 1px dashed #64748b; padding-top: 4px; font-size: 7.5pt; color: #64748b; }");
        sb.append(".footer { text-align: center; margin-top: 12px; font-size: 8pt; color: #94a3b8; }");
        sb.append("</style></head><body>");

        sb.append("<div class='contract-page'>");
        
        // Header
        sb.append("<div class='contract-header'>");
        sb.append("  <img src='").append(logoUri).append("' alt='Logo' class='logo' />");
        sb.append("  <div class='company-info'>");
        sb.append("    <div class='company-name'>شركة المرابحة لتقسيط الماكينات الذكية</div>");
        sb.append("    <div class='branch-name'>").append(escape(branchName)).append("</div>");
        sb.append("  </div>");
        sb.append("</div>");

        // Title
        sb.append("<div class='contract-title'>").append(isInstallment).append("</div>");

        // Sale Info
        sb.append("<div class='section'>");
        sb.append("  <div class='section-title'>بيانات التعاقد</div>");
        sb.append("  <div class='info-grid'>");
        sb.append("    <div class='info-row'><span class='label'>رقم العقد:</span><span class='val' style='font-family:monospace;'>").append(escape(sale.getReceiptNumber())).append("</span></div>");
        sb.append("    <div class='info-row'><span class='label'>تاريخ التعاقد:</span><span class='val'>").append(sale.getSaleDate() != null ? sale.getSaleDate().toString() : "").append("</span></div>");
        sb.append("    <div class='info-row'><span class='label'>فرع التعاقد:</span><span class='val'>").append(escape(branchName)).append("</span></div>");
        sb.append("    <div class='info-row'><span class='label'>نظام البيع:</span><span class='val'>").append("INSTALLMENT".equalsIgnoreCase(sale.getSaleType()) ? "تقسيط مرابحة" : "بيع كاش").append("</span></div>");
        sb.append("  </div>");
        sb.append("</div>");

        // Customer Info
        if (customer != null) {
            sb.append("<div class='section'>");
            sb.append("  <div class='section-title'>بيانات العميل (الطرف الثاني)</div>");
            sb.append("  <div class='info-grid'>");
            sb.append("    <div class='info-row'><span class='label'>الاسم:</span><span class='val'>").append(escape(customer.getName())).append("</span></div>");
            sb.append("    <div class='info-row'><span class='label'>كود العميل:</span><span class='val' style='font-family:monospace;'>").append(escape(customer.getBkCode())).append("</span></div>");
            sb.append("    <div class='info-row'><span class='label'>فئة / نوع العميل:</span><span class='val'>").append(escape(customer.getCustomerType() != null ? customer.getCustomerType() : "عام")).append("</span></div>");
            sb.append("    <div class='info-row'><span class='label'>رقم الهاتف:</span><span class='val'>").append(escape(customer.getPhone() != null ? customer.getPhone() : "—")).append("</span></div>");
            if (customer.getAddress() != null && !customer.getAddress().isBlank()) {
                sb.append("    <div class='info-row' style='grid-column: span 2;'><span class='label'>العنوان:</span><span class='val'>").append(escape(customer.getAddress())).append("</span></div>");
            }
            sb.append("  </div>");
            sb.append("</div>");
        }

        // Guarantor Info (if available)
        if (sale.getGuarantorName() != null && !sale.getGuarantorName().isBlank()) {
            sb.append("<div class='section'>");
            sb.append("  <div class='section-title'>بيانات الضامن</div>");
            sb.append("  <div class='info-grid'>");
            sb.append("    <div class='info-row'><span class='label'>اسم الضامن:</span><span class='val'>").append(escape(sale.getGuarantorName())).append("</span></div>");
            sb.append("    <div class='info-row'><span class='label'>صلة القرابة:</span><span class='val'>").append(escape(sale.getGuarantorRelation() != null ? sale.getGuarantorRelation() : "—")).append("</span></div>");
            sb.append("    <div class='info-row'><span class='label'>الرقم القومي:</span><span class='val'>").append(escape(sale.getGuarantorNationalId() != null ? sale.getGuarantorNationalId() : "—")).append("</span></div>");
            sb.append("    <div class='info-row'><span class='label'>هاتف الضامن:</span><span class='val'>").append(escape(sale.getGuarantorPhone() != null ? sale.getGuarantorPhone() : "—")).append("</span></div>");
            sb.append("  </div>");
            sb.append("</div>");
        }

        // Machine & Financial Details
        sb.append("<div class='section'>");
        sb.append("  <div class='section-title'>بيانات الماكينة والمبالغ المالية</div>");
        sb.append("  <div class='info-grid'>");
        sb.append("    <div class='info-row'><span class='label'>سيريال الماكينة:</span><span class='val' style='font-family:monospace;'>").append(escape(sale.getMachineSerial())).append("</span></div>");
        sb.append("    <div class='info-row'><span class='label'>إجمالي قيمة العقد:</span><span class='val amount'>").append(formatMoney(sale.getTotalPrice())).append("</span></div>");
        sb.append("    <div class='info-row'><span class='label'>الدفعة المقدمة:</span><span class='val'>").append(formatMoney(sale.getDownPayment())).append("</span></div>");
        if (sale.getDownPaymentReceipt() != null && !sale.getDownPaymentReceipt().isBlank()) {
            sb.append("    <div class='info-row'><span class='label'>رقم إيصال المقدم:</span><span class='val' style='font-family:monospace;'>").append(escape(sale.getDownPaymentReceipt())).append("</span></div>");
        }
        if (sale.getMonths() != null && sale.getMonths() > 0) {
            java.math.BigDecimal instMonthly = sale.getTotalPrice().subtract(sale.getDownPayment())
                    .divide(java.math.BigDecimal.valueOf(sale.getMonths()), 2, java.math.RoundingMode.HALF_UP);
            sb.append("    <div class='info-row'><span class='label'>عدد الأقساط:</span><span class='val'>").append(sale.getMonths()).append(" شهر</span></div>");
            sb.append("    <div class='info-row'><span class='label'>القسط الشهري:</span><span class='val amount'>").append(formatMoney(instMonthly)).append("</span></div>");
        }
        sb.append("  </div>");
        sb.append("</div>");

        // Installment Schedule Grid
        if (installments != null && !installments.isEmpty()) {
            sb.append("<div class='section'>");
            sb.append("  <div class='section-title'>جدول الأقساط الشهرية (").append(installments.size()).append(" قسط)</div>");
            sb.append("  <div class='installments-grid'>");
            for (Installment inst : installments) {
                boolean isPaid = Boolean.TRUE.equals(inst.getIsPaid());
                sb.append("    <div class='inst-card ").append(isPaid ? "paid" : "").append("'>");
                sb.append("      <div class='inst-num'>قسط ").append(inst.getInstallmentNo()).append(isPaid ? " (مسدد ✓)" : "").append("</div>");
                sb.append("      <div class='inst-amount'>").append(formatMoney(inst.getAmount())).append("</div>");
                sb.append("      <div class='inst-date'>").append(inst.getDueDate() != null ? inst.getDueDate().toString() : "").append("</div>");
                sb.append("    </div>");
            }
            sb.append("  </div>");
            sb.append("</div>");
        }

        // Totals Box
        sb.append("<div class='totals'>");
        sb.append("  <div class='total-row'><span class='label'>إجمالي سعر العقد:</span><span class='val'>").append(formatMoney(sale.getTotalPrice())).append("</span></div>");
        sb.append("  <div class='total-row'><span class='label'>إجمالي المسدد حتى تاريخه:</span><span class='val' style='color:#059669;'>").append(formatMoney(sale.getPaidAmount())).append("</span></div>");
        sb.append("  <div class='total-row final'><span>إجمالي المتبقي:</span><span>").append(formatMoney(sale.getRemainingAmount())).append("</span></div>");
        sb.append("</div>");

        // Declaration
        sb.append("<div class='declaration'>");
        sb.append("  <strong>إقرار واستلام:</strong> أقر أنا الموقع أدناه (الطرف الثاني) بأنني قد استلمت الماكينة الموضحة بياناتها وسيريالها بهذا العقد بحالة ممتازة وجديدة وصالحة للعمل تماماً بعد المعاينة، وأتعهد بسداد الأقساط المحددة بجدول السداد بعاليه في مواعيد استحقاقها دون تأخير، وفي حالة التأخر يعتبر باقي الأقساط مستحقة الأداء فوراً دون حاجة إلى إنذار أو إعذار.");
        sb.append("</div>");

        // Signatures
        sb.append("<div class='signatures'>");
        sb.append("  <div class='sig-box'>توقيع العميل (الطرف الثاني)<div class='sig-line'>التوقيع / البصمة</div></div>");
        if (sale.getGuarantorName() != null && !sale.getGuarantorName().isBlank()) {
            sb.append("  <div class='sig-box'>توقيع الضامن المتضامن<div class='sig-line'>التوقيع / البصمة</div></div>");
        }
        sb.append("  <div class='sig-box'>إدارة الفرع / ممثل المبيعات<div class='sig-line'>التوقيع والختم الرسمي</div></div>");
        sb.append("</div>");

        sb.append("<div class='footer'>تم إصدار هذا العقد إلكترونياً عبر منظومة مرابحة كلاود — شكراً لتعاملكم معنا</div>");
        sb.append("</div>");

        sb.append("<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>");
        sb.append("</body></html>");

        return sb.toString();
    }
}