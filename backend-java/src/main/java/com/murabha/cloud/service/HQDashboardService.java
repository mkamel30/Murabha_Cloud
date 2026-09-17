package com.murabha.cloud.service;

import com.murabha.cloud.entity.Branch;
import com.murabha.cloud.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HQDashboardService {

    private final DashboardService dashboardService;
    private final BranchRepository branchRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getHQStats(UUID filterBranchId) {
        Map<String, Object> baseStats = dashboardService.getStats(filterBranchId);
        List<Branch> branches = branchRepository.findAll();

        List<Map<String, Object>> benchmarks = new ArrayList<>();
        for (Branch b : branches) {
            if (Boolean.TRUE.equals(b.getIsOperational())) {
                Map<String, Object> bStats = dashboardService.getStats(b.getId());
                BigDecimal totalPaid = (BigDecimal) bStats.get("totalPaidAll");
                BigDecimal totalRemaining = (BigDecimal) bStats.get("totalRemainingAll");
                BigDecimal totalSales = totalPaid.add(totalRemaining);
                BigDecimal ratio = totalSales.compareTo(BigDecimal.ZERO) > 0
                        ? totalPaid.divide(totalSales, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                        : BigDecimal.ZERO;

                benchmarks.add(Map.of(
                        "branchId", b.getId(),
                        "branchName", b.getName(),
                        "branchCode", b.getCode(),
                        "totalSales", totalSales,
                        "totalPaid", totalPaid,
                        "totalRemaining", totalRemaining,
                        "collectionRatio", ratio,
                        "todayCollections", bStats.get("todayCollections"),
                        "overdueTotal", bStats.get("overdueTotal")
                ));
            }
        }

        Map<String, Object> response = new HashMap<>(baseStats);
        response.put("branchBenchmarks", benchmarks);
        return response;
    }
}