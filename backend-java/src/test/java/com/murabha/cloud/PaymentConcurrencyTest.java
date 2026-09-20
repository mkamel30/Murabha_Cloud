package com.murabha.cloud;

import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.entity.Branch;
import com.murabha.cloud.entity.Customer;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.repository.BranchRepository;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.MachineSaleRepository;
import com.murabha.cloud.service.SaleService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

public class PaymentConcurrencyTest extends BaseIntegrationTest {

    @Autowired
    private SaleService saleService;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private MachineSaleRepository saleRepository;

    @Test
    @DisplayName("Concurrent payments on the same sale should only succeed once due to Optimistic Locking")
    void testConcurrentPayment() throws Exception {
        Branch branch = branchRepository.save(Branch.builder()
                .code("BR_CONC")
                .name("Branch Conc")
                .isActive(true)
                .isOperational(true)
                .build());

        Customer customer = customerRepository.save(Customer.builder()
                .bkCode("BK-CONC")
                .name("Conc Customer")
                .customerType("REGULAR")
                .branchId(branch.getId())
                .build());

        MachineSale sale = saleRepository.save(MachineSale.builder()
                .receiptNumber("SAL-CONC")
                .customerId(customer.getId())
                .machineSerial("SER-CONC")
                .totalPrice(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .remainingAmount(new BigDecimal("1000.00"))
                .saleDate(LocalDate.now())
                .months(10)
                .status("ACTIVE")
                .saleType("INSTALLMENT")
                .branchId(branch.getId())
                .build());

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        List<Exception> exceptions = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    latch.await();
                    PaymentRequest payReq = new PaymentRequest();
                    payReq.setAmount(new BigDecimal("100.00"));
                    payReq.setPaymentPlace("Damen");
                    payReq.setPaymentType("INSTALLMENT");
                    payReq.setPaidAt(Instant.now());
                    // we don't set receiptNumber as it might be generated or we just use a random one
                    payReq.setReceiptNumber("REC-" + System.nanoTime());
                    
                    saleService.pay(sale.getId(), payReq, UUID.randomUUID());
                    successCount.incrementAndGet();
                } catch (ObjectOptimisticLockingFailureException e) {
                    failCount.incrementAndGet();
                    exceptions.add(e);
                } catch (Exception e) {
                    failCount.incrementAndGet();
                    exceptions.add(e);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown(); // start all threads
        doneLatch.await(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failCount.get()).isEqualTo(9);

        // Verify sale was updated correctly
        MachineSale updatedSale = saleRepository.findById(sale.getId()).orElseThrow();
        assertThat(updatedSale.getPaidAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(updatedSale.getRemainingAmount()).isEqualByComparingTo(new BigDecimal("900.00"));
    }
}
