package com.murabha.cloud;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.murabha.cloud.dto.*;
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
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
public class WorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        if (adminToken == null) {
            LoginRequest login = new LoginRequest();
            login.setUsername("admin");
            login.setPassword("Admin@2026!");

            MvcResult result = mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andReturn();

            Map<?, ?> resp = objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
            this.adminToken = (String) resp.get("accessToken");
        }
    }

    @Test
    @DisplayName("1. Excel Templates Generation Check")
    void testExcelTemplates() throws Exception {
        // Branches Excel Template
        mockMvc.perform(get("/api/branches/template")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

        // Users Excel Template
        mockMvc.perform(get("/api/admin/users/template")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    @DisplayName("2. Mail & Workflow Settings Check")
    void testSettingsEndpoints() throws Exception {
        // Get Workflow Settings
        mockMvc.perform(get("/api/settings/workflow")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("TWO_LEVEL"));

        // Update Workflow Settings
        WorkflowSettingsDto wf = new WorkflowSettingsDto();
        wf.setMode("ONE_LEVEL");
        wf.setRequireSupervisor(true);
        wf.setRequireBranchManager(false);

        mockMvc.perform(put("/api/settings/workflow")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wf)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        // Restore TWO_LEVEL
        wf.setMode("TWO_LEVEL");
        wf.setRequireBranchManager(true);
        mockMvc.perform(put("/api/settings/workflow")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wf)))
                .andExpect(status().isOk());

        // Get Mail Settings
        mockMvc.perform(get("/api/settings/mail")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("GMAIL"));
    }

    @Test
    @DisplayName("3. End-to-End Installment Request & Approval Pipeline")
    void testInstallmentRequestLifecycle() throws Exception {
        // A. Create Customer
        CustomerDto customerDto = CustomerDto.builder()
                .bkCode("BK-REQ-" + System.currentTimeMillis())
                .name("محمود سعيد إبراهيم")
                .phone("01099887766")
                .address("طنطا - شارع الجيش")
                .customerType("REGULAR")
                .build();

        MvcResult custResult = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(customerDto)))
                .andExpect(status().isCreated())
                .andReturn();

        CustomerDto customer = objectMapper.readValue(custResult.getResponse().getContentAsString(), CustomerDto.class);

        // B. Create Installment Request
        InstallmentRequestCreateDto reqDto = InstallmentRequestCreateDto.builder()
                .customerId(customer.getId())
                .machineSerial("POS-REQ-" + System.currentTimeMillis())
                .totalPrice(new BigDecimal("15000.00"))
                .downPayment(new BigDecimal("3000.00"))
                .months(12)
                .notes("طلب تقسيط جديد يحتاج مراجعة")
                .build();

        MvcResult reqResult = mockMvc.perform(post("/api/installment-requests")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.status").value("PENDING_SUPERVISOR"))
                .andReturn();

        Map<?, ?> createdReq = objectMapper.readValue(reqResult.getResponse().getContentAsString(), Map.class);
        UUID reqId = UUID.fromString((String) createdReq.get("id"));

        // C. Check Notifications
        mockMvc.perform(get("/api/notifications/unread-count")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // D. Supervisor Approves Request -> moves to PENDING_MANAGER (due to TWO_LEVEL mode)
        ApprovalActionRequest supervisorAction = ApprovalActionRequest.builder()
                .notes("تمت مراجعة أوراق العميل ومطابقتها للشروط")
                .build();

        mockMvc.perform(post("/api/installment-requests/" + reqId + "/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(supervisorAction)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_MANAGER"));

        // E. Branch Manager Approves Request -> moves to APPROVED
        ApprovalActionRequest managerAction = ApprovalActionRequest.builder()
                .notes("معتمد نهائياً، يرجى استلام الدفعة المقدمة")
                .build();

        mockMvc.perform(post("/api/installment-requests/" + reqId + "/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(managerAction)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // F. Convert to Sale by entering Down Payment Receipt
        ApprovalActionRequest convertAction = ApprovalActionRequest.builder()
                .downPaymentReceipt("DP-FINAL-" + System.currentTimeMillis())
                .build();

        mockMvc.perform(post("/api/installment-requests/" + reqId + "/convert-to-sale")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(convertAction)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.remainingAmount").value(12000.0));

        // G. Verify Request status is CONVERTED_TO_SALE
        mockMvc.perform(get("/api/installment-requests/" + reqId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONVERTED_TO_SALE"))
                .andExpect(jsonPath("$.saleId").isNotEmpty());
    }
}