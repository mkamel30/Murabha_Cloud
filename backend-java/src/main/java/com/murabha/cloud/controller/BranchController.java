package com.murabha.cloud.controller;

import com.murabha.cloud.entity.Branch;
import com.murabha.cloud.repository.BranchRepository;
import com.murabha.cloud.security.BranchContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/branch")
@RequiredArgsConstructor
public class BranchController {

    private final BranchRepository branchRepository;

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        UUID branchId = BranchContext.getBranchId();
        String name = "فرع افتراضي";
        if (branchId != null) {
            name = branchRepository.findById(branchId).map(Branch::getName).orElse(name);
        }
        return ResponseEntity.ok(Map.of(
                "branchId", branchId != null ? branchId : "default",
                "branchName", name,
                "createdAt", Instant.now().toString(),
                "updatedAt", Instant.now().toString()
        ));
    }

    @PutMapping("/config")
    public ResponseEntity<Map<String, Object>> updateConfig(@RequestBody Map<String, String> body) {
        String name = body.get("branchName");
        UUID branchId = BranchContext.getBranchId();
        if (branchId != null) {
            branchRepository.findById(branchId).ifPresent(b -> {
                b.setName(name);
                branchRepository.save(b);
            });
        }
        return ResponseEntity.ok(Map.of("branchName", name));
    }

    @GetMapping("/export-monthly")
    public ResponseEntity<byte[]> exportMonthly(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        String json = "{\"report\": \"monthly\", \"year\": " + year + ", \"month\": " + month + "}";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=monthly-report.json")
                .contentType(MediaType.APPLICATION_JSON)
                .body(json.getBytes(StandardCharsets.UTF_8));
    }
}