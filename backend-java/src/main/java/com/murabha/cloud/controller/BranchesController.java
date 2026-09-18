package com.murabha.cloud.controller;

import com.murabha.cloud.dto.BulkImportResultDto;
import com.murabha.cloud.entity.Branch;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.BranchRepository;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.security.UserPrincipal;
import com.murabha.cloud.service.ExcelImportExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchesController {

    private final BranchRepository branchRepository;
    private final ExcelImportExportService excelService;

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] excelData = excelService.generateBranchesTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=murabha_branches_template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelData);
    }

    @PostMapping("/bulk-import")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<BulkImportResultDto> bulkImport(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(excelService.importBranchesFromExcel(file));
    }

    @GetMapping
    public ResponseEntity<List<Branch>> getAll(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null && principal.getBranchId() != null && BranchContext.getBranchId() != null) {
            return ResponseEntity.ok(branchRepository.findAll().stream()
                    .filter(b -> b.getId().equals(BranchContext.getBranchId()))
                    .toList());
        }
        return ResponseEntity.ok(branchRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Branch> getById(@PathVariable UUID id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("الفرع غير موجود"));
        return ResponseEntity.ok(branch);
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Branch> create(@RequestBody Branch branch) {
        if (branchRepository.existsByCode(branch.getCode())) {
            throw new BadRequestException("كود الفرع مستخدم بالفعل");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(branchRepository.save(branch));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
    public ResponseEntity<Branch> update(@PathVariable UUID id, @RequestBody Branch updates) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("الفرع غير موجود"));
        if (updates.getName() != null) branch.setName(updates.getName());
        if (updates.getAddress() != null) branch.setAddress(updates.getAddress());
        if (updates.getPhone() != null) branch.setPhone(updates.getPhone());
        return ResponseEntity.ok(branchRepository.save(branch));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable UUID id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("الفرع غير موجود"));
        branchRepository.delete(branch);
        return ResponseEntity.ok(Map.of("message", "تم حذف الفرع بنجاح"));
    }

    @PostMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> toggleActive(@PathVariable UUID id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("الفرع غير موجود"));
        branch.setIsActive(!Boolean.TRUE.equals(branch.getIsActive()));
        branchRepository.save(branch);
        return ResponseEntity.ok(Map.of("message", "تم تحديث حالة الفرع بنجاح", "isActive", branch.getIsActive()));
    }
}