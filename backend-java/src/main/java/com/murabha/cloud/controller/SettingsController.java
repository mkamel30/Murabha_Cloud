package com.murabha.cloud.controller;

import com.murabha.cloud.entity.SystemSetting;
import com.murabha.cloud.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SystemSettingRepository settingRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        List<SystemSetting> settings = settingRepository.findAll();
        Map<String, Object> map = new HashMap<>();
        for (SystemSetting s : settings) {
            if ("enableCashSales".equals(s.getKey())) {
                map.put(s.getKey(), Boolean.parseBoolean(s.getValue()));
            } else if ("paymentPlaces".equals(s.getKey())) {
                // Return default or parsed json
                map.put(s.getKey(), List.of("Damen", "البريد", "البنك"));
            } else {
                map.put(s.getKey(), s.getValue());
            }
        }
        if (!map.containsKey("enableCashSales")) {
            map.put("enableCashSales", false);
        }
        if (!map.containsKey("paymentPlaces")) {
            map.put("paymentPlaces", List.of("Damen", "البريد", "البنك"));
        }
        return ResponseEntity.ok(map);
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String key, @RequestBody Map<String, Object> body) {
        Object val = body.get("value");
        String stringVal = val != null ? val.toString() : "";
        SystemSetting setting = settingRepository.findById(key)
                .orElse(SystemSetting.builder().key(key).build());
        setting.setValue(stringVal);
        setting.setUpdatedAt(Instant.now());
        settingRepository.save(setting);

        return ResponseEntity.ok(Map.of("success", true, "key", key, "value", val));
    }
}