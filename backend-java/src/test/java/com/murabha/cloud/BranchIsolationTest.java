package com.murabha.cloud;

import com.murabha.cloud.entity.Branch;
import com.murabha.cloud.entity.Customer;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.entity.User;
import com.murabha.cloud.entity.UserRole;
import com.murabha.cloud.repository.BranchRepository;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.MachineSaleRepository;
import com.murabha.cloud.repository.UserRepository;
import com.murabha.cloud.security.JwtTokenProvider;
import com.murabha.cloud.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
public class BranchIsolationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private MachineSaleRepository saleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private Branch branchA;
    private Branch branchB;
    private User managerB;
    private String tokenB;
    private MachineSale saleA;

    @BeforeEach
    void setUp() {
        branchA = branchRepository.save(Branch.builder()
                .code("BR_ISO_A")
                .name("Branch A")
                .isActive(true)
                .isOperational(true)
                .build());

        branchB = branchRepository.save(Branch.builder()
                .code("BR_ISO_B")
                .name("Branch B")
                .isActive(true)
                .isOperational(true)
                .build());

        User managerA = userRepository.save(User.builder()
                .username("mgr_iso_a")
                .name("Manager A")
                .password(passwordEncoder.encode("Pass123!"))
                .role(UserRole.BRANCH_MANAGER)
                .branchId(branchA.getId())
                .isActive(true)
                .build());

        managerB = userRepository.save(User.builder()
                .username("mgr_iso_b")
                .name("Manager B")
                .password(passwordEncoder.encode("Pass123!"))
                .role(UserRole.BRANCH_MANAGER)
                .branchId(branchB.getId())
                .isActive(true)
                .build());

        tokenB = jwtTokenProvider.generateAccessToken(UserPrincipal.create(managerB));

        Customer customerA = customerRepository.save(Customer.builder()
                .bkCode("BK-ISO-A")
                .name("Customer A")
                .customerType("REGULAR")
                .branchId(branchA.getId())
                .build());

        saleA = saleRepository.save(MachineSale.builder()
                .receiptNumber("SAL-ISO-A")
                .customerId(customerA.getId())
                .machineSerial("SER-ISO-A")
                .totalPrice(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .remainingAmount(new BigDecimal("1000.00"))
                .saleDate(LocalDate.now())
                .months(12)
                .status("ACTIVE")
                .saleType("INSTALLMENT")
                .branchId(branchA.getId())
                .build());
    }

    @Test
    @DisplayName("Branch Manager B cannot access Sale in Branch A")
    void testBranchIsolation() throws Exception {
        mockMvc.perform(get("/api/sales/" + saleA.getId())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden()); // or isNotFound() depending on the implementation
    }
}
