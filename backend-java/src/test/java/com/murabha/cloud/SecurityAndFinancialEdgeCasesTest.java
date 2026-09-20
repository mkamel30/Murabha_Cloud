package com.murabha.cloud;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.dto.SaleCreateRequest;
import com.murabha.cloud.entity.*;
import com.murabha.cloud.repository.*;
import com.murabha.cloud.security.JwtTokenProvider;
import com.murabha.cloud.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
public class SecurityAndFinancialEdgeCasesTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private MachineSaleRepository saleRepository;

    @Autowired
    private InstallmentRepository installmentRepository;

    @Autowired
    private SystemSettingRepository settingRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User adminUser;
    private String adminToken;
    private Branch branchA;
    private Branch branchB;
    private User branchACsr;
    private String branchACsrToken;
    private User hqManager;
    private String hqManagerToken;

    @BeforeEach
    void setUp() {
        // Ensure default HQ Admin
        adminUser = userRepository.findByUsername("admin").orElseGet(() -> {
            Branch hq = branchRepository.save(Branch.builder()
                    .code("HQ_TEST")
                    .name("HQ Test")
                    .isActive(true)
                    .isOperational(false)
                    .build());
            return userRepository.save(User.builder()
                    .username("admin")
                    .name("Super Admin")
                    .password(passwordEncoder.encode("Admin@2026!"))
                    .role(UserRole.SUPER_ADMIN)
                    .branchId(hq.getId())
                    .isActive(true)
                    .build());
        });
        adminToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(adminUser));

        // Create Branch A and Branch B
        branchA = branchRepository.save(Branch.builder()
                .code("BR_A_" + System.currentTimeMillis() % 100000)
                .name("فرع القاهرة التجريبي")
                .isActive(true)
                .isOperational(true)
                .build());

        branchB = branchRepository.save(Branch.builder()
                .code("BR_B_" + System.currentTimeMillis() % 100000)
                .name("فرع الإسكندرية التجريبي")
                .isActive(true)
                .isOperational(true)
                .build());

        // Create CSR in Branch A
        branchACsr = userRepository.save(User.builder()
                .username("csr_a_" + System.currentTimeMillis() % 100000)
                .name("موظف فرع أ")
                .password(passwordEncoder.encode("Secret123!"))
                .role(UserRole.BRANCH_CSR)
                .branchId(branchA.getId())
                .isActive(true)
                .build());
        branchACsrToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(branchACsr));

        // Create HQ Manager
        hqManager = userRepository.save(User.builder()
                .username("hq_mgr_" + System.currentTimeMillis() % 100000)
                .name("مدير المقر الرئيسي")
                .password(passwordEncoder.encode("Secret123!"))
                .role(UserRole.HQ_MANAGER)
                .branchId(adminUser.getBranchId())
                .isActive(true)
                .build());
        hqManagerToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(hqManager));
    }

    @Test
    @DisplayName("Security 1: Refresh token must be rejected when used as Bearer access token (401)")
    void testRefreshTokenRejectedAsBearer() throws Exception {
        String refreshToken = jwtTokenProvider.generateRefreshToken(UserPrincipal.create(adminUser));

        mockMvc.perform(get("/api/branches")
                        .header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Security 2: General GET /api/settings must never leak SMTP cleartext password")
    void testSettingsDoesNotLeakSmtpPassword() throws Exception {
        settingRepository.save(SystemSetting.builder()
                .key("mail_config")
                .value("{\"provider\":\"GMAIL\",\"host\":\"smtp.test.com\",\"password\":\"SuperSecretCleartextPassword123\"}")
                .updatedAt(Instant.now())
                .build());

        mockMvc.perform(get("/api/settings")
                        .header("Authorization", "Bearer " + branchACsrToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mail_config").doesNotExist());
    }

    @Test
    @DisplayName("Security 3: Anti-BOLA/IDOR - User in Branch A cannot read customer of Branch B (403)")
    void testCrossBranchCustomerReadBlocked() throws Exception {
        Customer customerB = customerRepository.save(Customer.builder()
                .bkCode("BK-" + (System.currentTimeMillis() % 100000))
                .name("عميل فرع الإسكندرية")
                .customerType("عام")
                .branchId(branchB.getId())
                .build());

        mockMvc.perform(get("/api/customers/" + customerB.getId())
                        .header("Authorization", "Bearer " + branchACsrToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security 4: Privilege Escalation - HQ_MANAGER cannot create a SUPER_ADMIN user (403)")
    void testHqManagerCannotCreateSuperAdmin() throws Exception {
        Map<String, Object> newAdminPayload = Map.of(
                "username", "attacker_admin_" + System.currentTimeMillis() % 100000,
                "name", "Attacker Super Admin",
                "email", "attacker@test.com",
                "password", "HackedPass123!",
                "role", "SUPER_ADMIN"
        );

        mockMvc.perform(post("/api/admin/users")
                        .header("Authorization", "Bearer " + hqManagerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newAdminPayload)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security 5: Primary Admin account cannot be deleted (400)")
    void testPrimaryAdminCannotBeDeleted() throws Exception {
        mockMvc.perform(delete("/api/admin/users/" + adminUser.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Financial 1: Overpayment exceeding remaining amount must be rejected (400)")
    void testOverpaymentRejected() throws Exception {
        Customer customerA = customerRepository.save(Customer.builder()
                .bkCode("BK-" + (System.currentTimeMillis() % 100000))
                .name("عميل فرع القاهرة")
                .customerType("عام")
                .branchId(branchA.getId())
                .build());

        MachineSale sale = saleRepository.save(MachineSale.builder()
                .receiptNumber("SAL-TEST-" + System.currentTimeMillis() % 100000)
                .customerId(customerA.getId())
                .machineSerial("SER-" + System.currentTimeMillis() % 100000)
                .totalPrice(new BigDecimal("500.00"))
                .paidAmount(new BigDecimal("0.00"))
                .remainingAmount(new BigDecimal("500.00"))
                .saleDate(LocalDate.now())
                .months(12)
                .status("ACTIVE")
                .saleType("INSTALLMENT")
                .branchId(branchA.getId())
                .build());

        // Attempt to pay 600 EGP on a 500 EGP debt
        PaymentRequest payReq = new PaymentRequest();
        payReq.setAmount(new BigDecimal("600.00"));

        mockMvc.perform(post("/api/sales/" + sale.getId() + "/pay")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("يتجاوز إجمالي المبلغ المتبقي")));
    }

    @Test
    @DisplayName("Financial 2: Non-positive payment amount (0 or negative) must be rejected (400)")
    void testNonPositivePaymentRejected() throws Exception {
        Customer customerA = customerRepository.save(Customer.builder()
                .bkCode("BK-" + (System.currentTimeMillis() % 100000))
                .name("عميل فرع القاهرة")
                .customerType("عام")
                .branchId(branchA.getId())
                .build());

        MachineSale sale = saleRepository.save(MachineSale.builder()
                .receiptNumber("SAL-TEST-" + System.currentTimeMillis() % 100000)
                .customerId(customerA.getId())
                .machineSerial("SER-" + System.currentTimeMillis() % 100000)
                .totalPrice(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .remainingAmount(new BigDecimal("1000.00"))
                .saleDate(LocalDate.now())
                .months(12)
                .status("ACTIVE")
                .saleType("INSTALLMENT")
                .branchId(branchA.getId())
                .build());

        PaymentRequest zeroReq = new PaymentRequest();
        zeroReq.setAmount(BigDecimal.ZERO);

        mockMvc.perform(post("/api/sales/" + sale.getId() + "/pay")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(zeroReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Financial 3: Cross-Sale Reward Waiver isolation - Foreign installments must not be waived")
    void testCrossSaleWaiverIsolation() throws Exception {
        Customer customerA = customerRepository.save(Customer.builder()
                .bkCode("BK-" + (System.currentTimeMillis() % 100000))
                .name("عميل فرع القاهرة")
                .customerType("عام")
                .branchId(branchA.getId())
                .build());

        MachineSale saleB = saleRepository.save(MachineSale.builder()
                .receiptNumber("SAL-B-" + System.currentTimeMillis() % 100000)
                .customerId(customerA.getId())
                .machineSerial("SER-B-" + System.currentTimeMillis() % 100000)
                .totalPrice(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .remainingAmount(new BigDecimal("1000.00"))
                .saleDate(LocalDate.now())
                .months(12)
                .status("ACTIVE")
                .saleType("INSTALLMENT")
                .branchId(branchA.getId())
                .build());

        Installment instB = installmentRepository.save(Installment.builder()
                .saleId(saleB.getId())
                .installmentNo(1)
                .dueDate(LocalDate.now().plusMonths(1))
                .amount(new BigDecimal("200.00"))
                .paidAmount(BigDecimal.ZERO)
                .isPaid(false)
                .isWaived(false)
                .branchId(branchA.getId())
                .build());

        MachineSale saleA = saleRepository.save(MachineSale.builder()
                .receiptNumber("SAL-A-" + System.currentTimeMillis() % 100000)
                .customerId(customerA.getId())
                .machineSerial("SER-A-" + System.currentTimeMillis() % 100000)
                .totalPrice(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .remainingAmount(new BigDecimal("1000.00"))
                .saleDate(LocalDate.now())
                .months(12)
                .status("ACTIVE")
                .saleType("INSTALLMENT")
                .branchId(branchA.getId())
                .build());

        // Try waiving Installment B under Sale A
        Map<String, Object> waivePayload = Map.of(
                "saleId", saleA.getId().toString(),
                "installmentIds", List.of(instB.getId().toString()),
                "reason", "مكافأة غير مشروعة"
        );

        mockMvc.perform(post("/api/rewards/waive-installments")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(waivePayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.waivedCount").value(0));

        // Verify installment B remains untouched
        Installment reloadedB = installmentRepository.findById(instB.getId()).orElseThrow();
        assertThat(reloadedB.getIsWaived()).isFalse();
        assertThat(reloadedB.getIsPaid()).isFalse();
    }
}