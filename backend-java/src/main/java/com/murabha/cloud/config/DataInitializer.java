package com.murabha.cloud.config;

import com.murabha.cloud.entity.Branch;
import com.murabha.cloud.entity.SystemSetting;
import com.murabha.cloud.entity.User;
import com.murabha.cloud.entity.UserRole;
import com.murabha.cloud.repository.BranchRepository;
import com.murabha.cloud.repository.SystemSettingRepository;
import com.murabha.cloud.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final SystemSettingRepository settingRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // 1. Seed HQ Branch if empty
        Branch hqBranch = branchRepository.findByCode("HQ").orElseGet(() -> {
            log.info("Initializing default HQ branch...");
            Branch b = Branch.builder()
                    .id(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                    .code("HQ")
                    .name("المقر الرئيسي (HQ)")
                    .address("القاهرة")
                    .phone("01000000000")
                    .isActive(true)
                    .isOperational(false)
                    .build();
            return branchRepository.save(b);
        });

        // 2. Seed or update Super Admin User
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            log.info("Initializing default Super Admin account (admin / Admin@2026!)...");
            admin = User.builder()
                    .id(UUID.fromString("00000000-0000-0000-0000-000000000002"))
                    .username("admin")
                    .name("مدير النظام (Super Admin)")
                    .email("admin@murabha.local")
                    .password(passwordEncoder.encode("Admin@2026!"))
                    .role(UserRole.SUPER_ADMIN)
                    .branchId(hqBranch.getId())
                    .isActive(true)
                    .build();
            userRepository.save(admin);
        }


        // 3. Seed Default System Settings
        if (!settingRepository.existsById("enableCashSales")) {
            settingRepository.save(SystemSetting.builder()
                    .key("enableCashSales")
                    .value("false")
                    .description("تفعيل ميزة البيع النقدي (الكاش)")
                    .updatedAt(Instant.now())
                    .build());
        }
        if (!settingRepository.existsById("paymentPlaces")) {
            settingRepository.save(SystemSetting.builder()
                    .key("paymentPlaces")
                    .value("[\"Damen\", \"البريد\", \"البنك\"]")
                    .description("أماكن وقنوات الدفع المعتمدة")
                    .updatedAt(Instant.now())
                    .build());
        }

        log.info("Murabha Cloud database seed check completed.");
    }
}