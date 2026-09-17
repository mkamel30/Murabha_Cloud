package com.murabha.cloud.controller;

import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.service.DashboardService;
import com.murabha.cloud.service.HQDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final HQDashboardService hqDashboardService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(dashboardService.getStats(BranchContext.getBranchId()));
    }

    @GetMapping("/hq")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER', 'HQ_ACCOUNTANT')")
    public ResponseEntity<Map<String, Object>> getHQStats(@RequestParam(required = false) UUID branchId) {
        return ResponseEntity.ok(hqDashboardService.getHQStats(branchId));
    }
}