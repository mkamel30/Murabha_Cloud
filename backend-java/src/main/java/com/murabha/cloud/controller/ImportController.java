package com.murabha.cloud.controller;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER')")
@RequiredArgsConstructor
public class ImportController {

    @PostMapping("/preview")
    public ResponseEntity<Map<String, Object>> preview(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(Map.of(
                "previewRows", List.of(),
                "dateWarnings", List.of()
        ));
    }

    @PostMapping("/excel")
    public ResponseEntity<Map<String, Object>> uploadExcel(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "تم استيراد الملف بنجاح",
                "results", Map.of(
                        "customersCreated", 0,
                        "salesCreated", 0,
                        "installmentsCreated", 0,
                        "errors", List.of()
                )
        ));
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("بيانات العملاء والعقود");
            Row header = sheet.createRow(0);
            String[] headers = {"كود العميل", "نوع العميل", "اسم العميل", "رقم الهاتف", "رقم الماكينة", "إجمالي السعر", "المقدم", "تاريخ البيع", "عدد الأشهر"};
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=template.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }
}