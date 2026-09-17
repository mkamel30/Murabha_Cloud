package com.murabha.cloud;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.murabha.cloud.dto.CustomerDto;
import com.murabha.cloud.dto.LoginRequest;
import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.dto.SaleCreateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
public class FullParityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String authToken;

    @BeforeEach
    void setUp() throws Exception {
        if (authToken == null) {
            LoginRequest login = new LoginRequest();
            login.setUsername("admin");
            login.setPassword("Admin@2026!");

            MvcResult result = mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").isNotEmpty())
                    .andReturn();

            Map<?, ?> resp = objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
            this.authToken = (String) resp.get("accessToken");
        }
    }

    @Test
    @DisplayName("1. Health Endpoint Parity Check")
    void testHealthEndpoint() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.db").value("connected"));
    }

    @Test
    @DisplayName("2. Auth /me with Bearer Token")
    void testAuthMe() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.username").value("admin"))
                .andExpect(jsonPath("$.user.role").value("SUPER_ADMIN"));
    }

    @Test
    @DisplayName("3. Admin Users Listing (LazyInitializationException Fix Verification)")
    void testAdminUsersListing() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].username").value("admin"))
                .andExpect(jsonPath("$[0].branch").exists())
                .andExpect(jsonPath("$[0].branch.code").value("HQ"));
    }

    @Test
    @DisplayName("4. Branches & System Settings Verification")
    void testBranchesAndSettings() throws Exception {
        mockMvc.perform(get("/api/branches")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].code").value("HQ"));

        mockMvc.perform(get("/api/settings")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enableCashSales").value(false));
    }

    @Test
    @DisplayName("5. Customer, Sale, and FIFO Payment Full Lifecycle")
    void testCustomerSalePaymentLifecycle() throws Exception {
        // A. Create Customer
        CustomerDto customerDto = CustomerDto.builder()
                .bkCode("BK-" + System.currentTimeMillis())
                .name("أحمد محمد علي")
                .phone("01012345678")
                .address("القاهرة - المعادي")
                .customerType("REGULAR")
                .build();

        MvcResult custResult = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(customerDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name").value("أحمد محمد علي"))
                .andReturn();

        CustomerDto createdCustomer = objectMapper.readValue(custResult.getResponse().getContentAsString(), CustomerDto.class);
        UUID customerId = createdCustomer.getId();

        // B. Create Machine Sale
        SaleCreateRequest saleRequest = SaleCreateRequest.builder()
                .customerId(customerId)
                .machineSerial("POS-SN-" + System.currentTimeMillis())
                .saleType("INSTALLMENT")
                .totalPrice(new BigDecimal("12000.00"))
                .downPayment(new BigDecimal("2000.00"))
                .downPaymentReceipt("DP-REC-001")
                .paymentPlace("Damen")
                .saleDate(LocalDate.now())
                .firstDueDate(LocalDate.now().plusMonths(1))
                .months(10)
                .installmentAmount(new BigDecimal("1000.00"))
                .build();

        MvcResult saleResult = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(saleRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.remainingAmount").value(10000.0))
                .andExpect(jsonPath("$.installments", hasSize(10)))
                .andReturn();

        Map<?, ?> createdSale = objectMapper.readValue(saleResult.getResponse().getContentAsString(), Map.class);
        UUID saleId = UUID.fromString((String) createdSale.get("id"));

        // C. Verify Installments
        mockMvc.perform(get("/api/installments")
                        .header("Authorization", "Bearer " + authToken)
                        .param("saleId", saleId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(10)))
                .andExpect(jsonPath("$[0].amount").value(1000.0));

        // D. Record FIFO Payment via /api/sales/{saleId}/pay
        PaymentRequest paymentRequest = PaymentRequest.builder()
                .receiptNumber("PAY-REC-" + System.currentTimeMillis())
                .paymentType("INSTALLMENT")
                .amount(new BigDecimal("1000.00"))
                .paymentPlace("Damen")
                .paidAt(Instant.now())
                .build();

        mockMvc.perform(post("/api/sales/" + saleId + "/pay")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(paymentRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.receiptNumber").isNotEmpty())
                .andExpect(jsonPath("$.amount").value(1000.0));

        // E. Verify Payments List
        mockMvc.perform(get("/api/payments")
                        .header("Authorization", "Bearer " + authToken)
                        .param("saleId", saleId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("6. Dashboard, Analytics & Export Parity Check")
    void testDashboardAndExport() throws Exception {
        // Branch Dashboard stats
        mockMvc.perform(get("/api/dashboard/stats")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCustomers").exists());

        // HQ Dashboard stats
        mockMvc.perform(get("/api/dashboard/hq")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branchBenchmarks").exists());

        // Analytics
        mockMvc.perform(get("/api/analytics/dashboard")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk());

        // Sales Export Excel
        mockMvc.perform(get("/api/export/sales")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }
}
