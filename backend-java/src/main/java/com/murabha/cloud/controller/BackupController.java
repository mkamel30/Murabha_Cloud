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
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importBackup(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_IMPLEMENTED).body(Map.of("error", "Not implemented"));
    }

    @PostMapping("/auto")
    public ResponseEntity<Map<String, Object>> autoBackup() {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_IMPLEMENTED).body(Map.of("error", "Not implemented"));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Map<String, Object>>> listBackups() {
        return ResponseEntity.ok(List.of());
    }
}