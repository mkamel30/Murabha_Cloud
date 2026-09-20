package com.murabha.cloud.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final javax.sql.DataSource dataSource;

    public HealthController(javax.sql.DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        try (java.sql.Connection conn = dataSource.getConnection()) {
            response.put("db", "connected");
            response.put("dbType", conn.getMetaData().getDatabaseProductName());
        } catch (Exception e) {
            response.put("db", "error");
            response.put("error", e.getMessage());
            response.put("status", "error");
        }
        response.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(response);
    }
}