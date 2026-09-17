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

    public String generateReceiptHtml(Payment payment) {
        return "<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='UTF-8'><title>إيصال سداد</title>" +
                "<style>body{font-family:Tahoma,sans-serif;padding:20px;text-align:center;}" +
                ".card{border:1px solid #ccc;padding:20px;max-width:400px;margin:auto;border-radius:8px;}</style></head>" +
                "<body><div class='card'><h2>إيصال استلام نقدية</h2>" +
                "<p><strong>رقم الإيصال:</strong> " + payment.getReceiptNumber() + "</p>" +
                "<p><strong>المبلغ:</strong> " + payment.getAmount() + " ج.م</p>" +
                "<p><strong>مكان الدفع:</strong> " + (payment.getPaymentPlace() != null ? payment.getPaymentPlace() : "Damen") + "</p>" +
                "<p><strong>تاريخ السداد:</strong> " + payment.getPaidAt() + "</p>" +
                "<script>window.print();</script></div></body></html>";
    }

    public String generateContractHtml(MachineSale sale) {
        return "<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='UTF-8'><title>عقد بيع</title>" +
                "<style>body{font-family:Tahoma,sans-serif;padding:30px;line-height:1.6;}" +
                ".container{max-width:700px;margin:auto;border:1px solid #ddd;padding:30px;}</style></head>" +
                "<body><div class='container'><h1>عقد بيع بالمرابحة</h1>" +
                "<p><strong>رقم العقد:</strong> " + sale.getReceiptNumber() + "</p>" +
                "<p><strong>سيريال الماكينة:</strong> " + sale.getMachineSerial() + "</p>" +
                "<p><strong>إجمالي السعر:</strong> " + sale.getTotalPrice() + " ج.م</p>" +
                "<p><strong>المقدم:</strong> " + sale.getDownPayment() + " ج.م</p>" +
                "<p><strong>المتبقي:</strong> " + sale.getRemainingAmount() + " ج.م</p>" +
                "<p><strong>تاريخ البيع:</strong> " + sale.getSaleDate() + "</p>" +
                "<script>window.print();</script></div></body></html>";
    }
}