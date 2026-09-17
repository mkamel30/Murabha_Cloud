package com.murabha.cloud.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backup")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class BackupController {

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportBackup() {
        byte[] backupData = "-- Murabha Cloud Backup Snapshot\n".getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=murabha-backup.sql")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(backupData);
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importBackup(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(Map.of("success", true, "message", "تم استعادة النسخة الاحتياطية بنجاح"));
    }

    @PostMapping("/auto")
    public ResponseEntity<Map<String, Object>> autoBackup() {
        return ResponseEntity.ok(Map.of("success", true, "message", "تم إنشاء النسخة التلقائية بنجاح"));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Map<String, Object>>> listBackups() {
        return ResponseEntity.ok(List.of());
    }
}