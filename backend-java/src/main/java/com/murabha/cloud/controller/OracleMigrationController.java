package com.murabha.cloud.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/oracle")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class OracleMigrationController {

    @PostMapping("/test-connection")
    public ResponseEntity<Map<String, Object>> testConnection(@RequestBody Map<String, Object> cfg) {
        String host = (String) cfg.get("host");
        int port = cfg.get("port") != null ? Integer.parseInt(cfg.get("port").toString()) : 1521;
        String service = (String) cfg.get("serviceName");
        String username = (String) cfg.get("username");
        String password = (String) cfg.get("password");

        String jdbcUrl = String.format("jdbc:oracle:thin:@//%s:%d/%s", host, port, service);
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password)) {
            String dbVersion = conn.getMetaData().getDatabaseProductVersion();
            return ResponseEntity.ok(Map.of("success", true, "version", dbVersion, "message", "تم الاتصال بقاعدة بيانات أوراكل بنجاح"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", "فشل الاتصال: " + e.getMessage()));
        }
    }

    @PostMapping("/provision-schema")
    public ResponseEntity<Map<String, Object>> provisionSchema(@RequestBody Map<String, Object> cfg) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_IMPLEMENTED).body(Map.of("error", "Not implemented"));
    }

    @PostMapping("/migrate-data")
    public ResponseEntity<Map<String, Object>> migrateData(@RequestBody Map<String, Object> cfg) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_IMPLEMENTED).body(Map.of("error", "Not implemented"));
    }
}