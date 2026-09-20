package com.murabha.cloud.service;

import com.murabha.cloud.dto.BulkImportResultDto;
import com.murabha.cloud.entity.Branch;
import com.murabha.cloud.entity.User;
import com.murabha.cloud.entity.UserRole;
import com.murabha.cloud.repository.BranchRepository;
import com.murabha.cloud.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFDataValidationHelper;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelImportExportService {

    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public byte[] generateBranchesTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("قالب الفروع");
            sheet.setRightToLeft(true);

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);

            String[] headers = {
                    "كود الفرع (إلزامي)*",
                    "اسم الفرع (إلزامي)*",
                    "العنوان",
                    "رقم الهاتف",
                    "تشغيلي؟ (نعم/لا)"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Sample Row 1
            Row sampleRow = sheet.createRow(1);
            sampleRow.createCell(0).setCellValue("BR-ALEX");
            sampleRow.createCell(1).setCellValue("فرع الإسكندرية - سموحة");
            sampleRow.createCell(2).setCellValue("شارع فوزي معاذ - سموحة");
            sampleRow.createCell(3).setCellValue("01012345678");
            sampleRow.createCell(4).setCellValue("نعم");
            for (int i = 0; i < headers.length; i++) {
                sampleRow.getCell(i).setCellStyle(dataStyle);
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate branches template: {}", e.getMessage());
            throw new RuntimeException("فشل إنشاء قالب الفروع: " + e.getMessage());
        }
    }

    @Transactional
    public BulkImportResultDto importBranchesFromExcel(MultipartFile file) {
        BulkImportResultDto result = new BulkImportResultDto();
        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int totalRows = sheet.getLastRowNum();
            result.setTotalRows(totalRows);

            List<Branch> branchesToSave = new ArrayList<>();
            Set<String> seenCodes = new HashSet<>();

            for (int r = 1; r <= totalRows; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String code = getCellValue(row.getCell(0));
                String name = getCellValue(row.getCell(1));
                String address = getCellValue(row.getCell(2));
                String phone = getCellValue(row.getCell(3));
                String operationalStr = getCellValue(row.getCell(4));

                if (code.isBlank() && name.isBlank()) continue;

                if (code.isBlank()) {
                    result.getErrors().add("السطر " + (r + 1) + ": كود الفرع مطلوب");
                    continue;
                }
                if (name.isBlank()) {
                    result.getErrors().add("السطر " + (r + 1) + ": اسم الفرع مطلوب");
                    continue;
                }

                code = code.trim().toUpperCase();
                if (seenCodes.contains(code) || branchRepository.findByCode(code).isPresent()) {
                    result.getErrors().add("السطر " + (r + 1) + ": كود الفرع (" + code + ") مكرر بالفعل");
                    continue;
                }
                seenCodes.add(code);

                boolean isOperational = !"لا".equalsIgnoreCase(operationalStr.trim());

                Branch branch = Branch.builder()
                        .code(code)
                        .name(name.trim())
                        .address(!address.isBlank() ? address.trim() : null)
                        .phone(!phone.isBlank() ? phone.trim() : null)
                        .isActive(true)
                        .isOperational(isOperational)
                        .build();

                branchesToSave.add(branch);
                result.getCreatedItems().add(name + " (" + code + ")");
            }

            branchRepository.saveAll(branchesToSave);
            result.setSuccessCount(branchesToSave.size());
            result.setErrorCount(result.getErrors().size());
            return result;
        } catch (Exception e) {
            log.error("Failed to import branches from Excel: {}", e.getMessage());
            throw new RuntimeException("فشل استيراد الفروع من ملف الإكسيل: " + e.getMessage());
        }
    }

    public byte[] generateUsersTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = (XSSFSheet) workbook.createSheet("قالب المستخدمين");
            sheet.setRightToLeft(true);

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);

            String[] headers = {
                    "اسم المستخدم (Login)*",
                    "الاسم بالكامل*",
                    "البريد الإلكتروني",
                    "كلمة المرور الأولية*",
                    "الدور الوظيفي (Role)*",
                    "كود الفرع (Branch Code)*"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Dropdown validation for Roles
            String[] roles = {"BRANCH_CSR", "BRANCH_SUPERVISOR", "BRANCH_MANAGER", "BRANCH_COLLECTOR", "BRANCH_DATA_ENTRY"};
            DataValidationHelper validationHelper = new XSSFDataValidationHelper(sheet);
            CellRangeAddressList roleAddressList = new CellRangeAddressList(1, 1000, 4, 4);
            DataValidationConstraint roleConstraint = validationHelper.createExplicitListConstraint(roles);
            DataValidation roleValidation = validationHelper.createValidation(roleConstraint, roleAddressList);
            roleValidation.setShowErrorBox(true);
            sheet.addValidationData(roleValidation);

            // Sample Rows
            Row sample1 = sheet.createRow(1);
            sample1.createCell(0).setCellValue("ahmed.csr");
            sample1.createCell(1).setCellValue("أحمد سمير علي");
            sample1.createCell(2).setCellValue("ahmed.csr@murabha.local");
            sample1.createCell(3).setCellValue("Admin@2026!");
            sample1.createCell(4).setCellValue("BRANCH_CSR");
            sample1.createCell(5).setCellValue("HQ");

            Row sample2 = sheet.createRow(2);
            sample2.createCell(0).setCellValue("khaled.sup");
            sample2.createCell(1).setCellValue("خالد عبد الرحمن");
            sample2.createCell(2).setCellValue("khaled.sup@murabha.local");
            sample2.createCell(3).setCellValue("Admin@2026!");
            sample2.createCell(4).setCellValue("BRANCH_SUPERVISOR");
            sample2.createCell(5).setCellValue("HQ");

            for (int i = 0; i < headers.length; i++) {
                sample1.getCell(i).setCellStyle(dataStyle);
                sample2.getCell(i).setCellStyle(dataStyle);
                sheet.autoSizeColumn(i);
            }

            // Sheet 2: Reference of existing branch codes
            Sheet refSheet = workbook.createSheet("الأكواد المرجعية للفروع");
            refSheet.setRightToLeft(true);
            Row refHeader = refSheet.createRow(0);
            refHeader.createCell(0).setCellValue("كود الفرع");
            refHeader.createCell(1).setCellValue("اسم الفرع");
            refHeader.getCell(0).setCellStyle(headerStyle);
            refHeader.getCell(1).setCellStyle(headerStyle);

            List<Branch> existingBranches = branchRepository.findAll();
            int rIdx = 1;
            for (Branch b : existingBranches) {
                Row r = refSheet.createRow(rIdx++);
                r.createCell(0).setCellValue(b.getCode());
                r.createCell(1).setCellValue(b.getName());
                r.getCell(0).setCellStyle(dataStyle);
                r.getCell(1).setCellStyle(dataStyle);
            }
            refSheet.autoSizeColumn(0);
            refSheet.autoSizeColumn(1);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate users template: {}", e.getMessage());
            throw new RuntimeException("فشل إنشاء قالب المستخدمين: " + e.getMessage());
        }
    }

    @Transactional
    public BulkImportResultDto importUsersFromExcel(MultipartFile file) {
        BulkImportResultDto result = new BulkImportResultDto();
        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int totalRows = sheet.getLastRowNum();
            result.setTotalRows(totalRows);

            List<User> usersToSave = new ArrayList<>();
            Set<String> seenUsernames = new HashSet<>();

            Map<String, Branch> branchMap = new HashMap<>();
            for (Branch b : branchRepository.findAll()) {
                branchMap.put(b.getCode().toUpperCase(), b);
            }

            for (int r = 1; r <= totalRows; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String username = getCellValue(row.getCell(0));
                String name = getCellValue(row.getCell(1));
                String email = getCellValue(row.getCell(2));
                String password = getCellValue(row.getCell(3));
                String roleStr = getCellValue(row.getCell(4));
                String branchCode = getCellValue(row.getCell(5));

                if (username.isBlank() && name.isBlank()) continue;

                if (username.isBlank()) {
                    result.getErrors().add("السطر " + (r + 1) + ": اسم المستخدم مطلوب");
                    continue;
                }
                if (name.isBlank()) {
                    result.getErrors().add("السطر " + (r + 1) + ": الاسم بالكامل مطلوب");
                    continue;
                }
                if (password.isBlank() || password.length() < 6) {
                    result.getErrors().add("السطر " + (r + 1) + ": كلمة المرور يجب أن تكون 6 أحرف على الأقل");
                    continue;
                }

                username = username.trim().toLowerCase();
                if (seenUsernames.contains(username) || userRepository.existsByUsername(username)) {
                    result.getErrors().add("السطر " + (r + 1) + ": اسم المستخدم (" + username + ") مستخدم بالفعل");
                    continue;
                }
                seenUsernames.add(username);

                UserRole role;
                try {
                    role = UserRole.valueOf(roleStr.trim().toUpperCase());
                } catch (Exception e) {
                    result.getErrors().add("السطر " + (r + 1) + ": الدور الوظيفي غير صحيح: " + roleStr);
                    continue;
                }

                if (role == UserRole.SUPER_ADMIN) {
                    org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                    boolean isSuperAdmin = false;
                    if (auth != null && auth.getPrincipal() instanceof com.murabha.cloud.security.UserPrincipal p) {
                        if (p.getRole() == UserRole.SUPER_ADMIN) {
                            isSuperAdmin = true;
                        }
                    }
                    if (!isSuperAdmin) {
                        result.getErrors().add("السطر " + (r + 1) + ": لا تملك صلاحية إنشاء حساب Super Admin");
                        continue;
                    }
                }

                branchCode = branchCode.trim().toUpperCase();
                Branch branch = branchMap.get(branchCode);
                if (branch == null) {
                    result.getErrors().add("السطر " + (r + 1) + ": كود الفرع (" + branchCode + ") غير موجود في النظام");
                    continue;
                }

                User user = User.builder()
                        .username(username)
                        .name(name.trim())
                        .email(!email.isBlank() ? email.trim() : null)
                        .password(passwordEncoder.encode(password))
                        .role(role)
                        .branchId(branch.getId())
                        .branch(branch)
                        .isActive(true)
                        .build();

                usersToSave.add(user);
                result.getCreatedItems().add(name + " (@" + username + ") - " + role.name());
            }

            userRepository.saveAll(usersToSave);
            result.setSuccessCount(usersToSave.size());
            result.setErrorCount(result.getErrors().size());
            return result;
        } catch (Exception e) {
            log.error("Failed to import users from Excel: {}", e.getMessage());
            throw new RuntimeException("فشل استيراد المستخدمين من ملف الإكسيل: " + e.getMessage());
        }
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        DataFormatter formatter = new DataFormatter();
        return formatter.formatCellValue(cell).trim();
    }

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontName("Cairo");
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDataStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setFontName("Cairo");
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }
}