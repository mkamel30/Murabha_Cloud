package com.murabha.cloud.controller;

import com.murabha.cloud.dto.BulkImportResultDto;
import com.murabha.cloud.entity.User;
import com.murabha.cloud.entity.UserRole;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.UserRepository;
import com.murabha.cloud.service.ExcelImportExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
@RequiredArgsConstructor
public class AdminUsersController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ExcelImportExportService excelService;

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] excelData = excelService.generateUsersTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=murabha_users_template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelData);
    }

    @PostMapping("/bulk-import")
    public ResponseEntity<BulkImportResultDto> bulkImport(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(excelService.importUsersFromExcel(file));
    }

    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<User> create(@RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("اسم المستخدم مستخدم بالفعل");
        }

        User user = User.builder()
                .username(username)
                .name((String) body.get("name"))
                .email((String) body.get("email"))
                .password(passwordEncoder.encode((String) body.get("password")))
                .role(UserRole.valueOf((String) body.get("role")))
                .branchId(body.get("branchId") != null ? UUID.fromString((String) body.get("branchId")) : null)
                .isActive(true)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(userRepository.save(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("المستخدم غير موجود"));

        if (body.containsKey("name")) user.setName((String) body.get("name"));
        if (body.containsKey("email")) user.setEmail((String) body.get("email"));
        if (body.containsKey("role")) user.setRole(UserRole.valueOf((String) body.get("role")));
        if (body.containsKey("branchId")) {
            user.setBranchId(body.get("branchId") != null ? UUID.fromString((String) body.get("branchId")) : null);
        }

        return ResponseEntity.ok(userRepository.save(user));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("المستخدم غير موجود"));
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            throw new BadRequestException("يجب أن تكون كلمة المرور 6 أحرف على الأقل");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "تم إعادة تعيين كلمة المرور بنجاح"));
    }

    @PostMapping("/{id}/toggle-active")
    public ResponseEntity<Map<String, Object>> toggleActive(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("المستخدم غير موجود"));
        user.setIsActive(!Boolean.TRUE.equals(user.getIsActive()));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "تم تحديث حالة الحساب", "isActive", user.getIsActive()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}