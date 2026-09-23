package com.murabha.cloud.service;

import com.murabha.cloud.dto.PaymentRequest;
import com.murabha.cloud.dto.SaleCreateRequest;
import com.murabha.cloud.entity.Customer;
import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.InstallmentRepository;
import com.murabha.cloud.repository.MachineSaleRepository;
import com.murabha.cloud.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SaleServiceTest {

    @Mock
    private MachineSaleRepository saleRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private InstallmentRepository installmentRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private ReceiptSequenceService receiptSequenceService;

    @Mock
    private com.murabha.cloud.repository.SystemSettingRepository systemSettingRepository;
    @Mock
    private com.murabha.cloud.repository.InstallmentRequestRepository installmentRequestRepository;
    @Mock
    private AuditService auditService;

    @InjectMocks
    private SaleService saleService;

    private UUID saleId;
    private UUID customerId;
    private UUID branchId;
    private UUID userId;

    private Customer customer;
    private MachineSale sale;

    @BeforeEach
    void setUp() {
        saleId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        branchId = UUID.randomUUID();
        userId = UUID.randomUUID();

        customer = new Customer();
        customer.setId(customerId);
        customer.setName("Test Customer");
        customer.setBranchId(branchId);

        sale = MachineSale.builder()
                .id(saleId)
                .customerId(customerId)
                .branchId(branchId)
                .machineSerial("SN123")
                .totalPrice(BigDecimal.valueOf(1000))
                .downPayment(BigDecimal.valueOf(200))
                .paidAmount(BigDecimal.valueOf(200))
                .remainingAmount(BigDecimal.valueOf(800))
                .status("ACTIVE")
                .saleDate(LocalDate.now())
                .firstDueDate(LocalDate.now().plusMonths(1))
                .months(4)
                .build();
    }

    @Test
    void testCreate_InstallmentSale_Success() {
        SaleCreateRequest req = new SaleCreateRequest();
        req.setCustomerId(customerId);
        req.setMachineSerial("SN123");
        req.setTotalPrice(BigDecimal.valueOf(1000));
        req.setDownPayment(BigDecimal.valueOf(200));
        req.setDownPaymentReceipt("DP-123");
        req.setSaleType("INSTALLMENT");
        req.setSaleDate(LocalDate.now());
        req.setMonths(4);

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(saleRepository.findByMachineSerialIgnoreCaseAndStatusNot(anyString(), anyString())).thenReturn(Collections.emptyList());
        when(installmentRequestRepository.findByMachineSerialIgnoreCaseAndStatusIn(anyString(), anyList())).thenReturn(Collections.emptyList());
        when(paymentRepository.findByReceiptNumber(anyString())).thenReturn(Optional.empty());
        when(saleRepository.findByReceiptNumber(anyString())).thenReturn(Optional.empty());
        
        when(receiptSequenceService.getNextSaleReceiptNumber()).thenReturn(1L);
        when(systemSettingRepository.findById("requireGuarantor")).thenReturn(Optional.empty());
        when(saleRepository.save(any(MachineSale.class))).thenAnswer(invocation -> {
            MachineSale s = invocation.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        MachineSale createdSale = saleService.create(req, branchId, userId);

        assertNotNull(createdSale);
        assertEquals(BigDecimal.valueOf(1000), createdSale.getTotalPrice());
        assertEquals(BigDecimal.valueOf(200), createdSale.getDownPayment());
        assertEquals("ACTIVE", createdSale.getStatus());

        verify(installmentRepository, times(1)).saveAll(anyList());
        verify(paymentRepository, times(1)).save(any(Payment.class));
        verify(auditService, times(1)).log(eq("CREATE_SALE"), any(), any(), any(), any());
    }

    @Test
    void testCreate_SerialInUse() {
        SaleCreateRequest req = new SaleCreateRequest();
        req.setCustomerId(customerId);
        req.setMachineSerial("SN123");

        MachineSale existing = MachineSale.builder().id(UUID.randomUUID()).receiptNumber("R1").build();
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(saleRepository.findByMachineSerialIgnoreCaseAndStatusNot("SN123", "VOIDED"))
                .thenReturn(Collections.singletonList(existing));

        assertThrows(BadRequestException.class, () -> saleService.create(req, branchId, userId));
    }

    @Test
    void testPay_Success() {
        PaymentRequest req = new PaymentRequest();
        req.setAmount(BigDecimal.valueOf(200));
        req.setReceiptNumber("PAY-001");

        when(saleRepository.findById(saleId)).thenReturn(Optional.of(sale));
        when(paymentRepository.findByReceiptNumber("PAY-001")).thenReturn(Optional.empty());
        when(saleRepository.findByReceiptNumber("PAY-001")).thenReturn(Optional.empty());
        
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        Installment inst1 = Installment.builder()
                .id(UUID.randomUUID())
                .amount(BigDecimal.valueOf(200))
                .paidAmount(BigDecimal.ZERO)
                .isPaid(false)
                .build();
        
        when(installmentRepository.findBySaleIdOrderByInstallmentNoAsc(saleId))
                .thenReturn(Collections.singletonList(inst1));
        when(saleRepository.save(any(MachineSale.class))).thenReturn(sale);

        Map<String, Object> result = saleService.pay(saleId, req, userId);

        assertEquals("PAY-001", result.get("receiptNumber"));
        assertEquals(BigDecimal.valueOf(200), result.get("amount"));
        assertTrue(inst1.getIsPaid());
        assertEquals(BigDecimal.valueOf(200), inst1.getPaidAmount());
        assertEquals(BigDecimal.valueOf(400), sale.getPaidAmount());
        assertEquals(BigDecimal.valueOf(600), sale.getRemainingAmount());
    }

    @Test
    void testVoidSale_Success() {
        sale.setPaidAmount(BigDecimal.ZERO);
        when(saleRepository.findById(saleId)).thenReturn(Optional.of(sale));

        Installment inst = Installment.builder()
                .id(UUID.randomUUID())
                .isPaid(false)
                .build();
        when(installmentRepository.findBySaleIdOrderByInstallmentNoAsc(saleId))
                .thenReturn(Collections.singletonList(inst));

        saleService.voidSale(saleId, "Customer request");

        assertEquals("VOIDED", sale.getStatus());
        assertEquals("Customer request", sale.getVoidReason());
        assertTrue(inst.getIsWaived());
        
        verify(saleRepository, times(1)).save(sale);
        verify(installmentRepository, times(1)).save(inst);
        verify(auditService, times(1)).log(eq("VOID_SALE"), any(), any(), any(), any());
    }

    @Test
    void testVoidSale_WithPayments() {
        sale.setPaidAmount(BigDecimal.valueOf(200)); // Already has payments
        when(saleRepository.findById(saleId)).thenReturn(Optional.of(sale));

        assertThrows(BadRequestException.class, () -> saleService.voidSale(saleId, "Reason"));
    }

    @Test
    void testFullRecalculate_Success() {
        Map<String, Object> body = new HashMap<>();
        body.put("totalPrice", 1200);
        body.put("downPayment", 300);
        body.put("months", 6);

        // Reset paid amount to 0 so we can recalculate
        sale.setPaidAmount(BigDecimal.ZERO);
        sale.setDownPayment(BigDecimal.ZERO); // assuming no dp paid yet
        
        when(saleRepository.findById(saleId)).thenReturn(Optional.of(sale));
        when(installmentRepository.findBySaleIdOrderByInstallmentNoAsc(saleId))
                .thenReturn(new ArrayList<>()); // no paid installments

        when(saleRepository.save(any(MachineSale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MachineSale updated = saleService.fullRecalculate(saleId, body);

        assertEquals(BigDecimal.valueOf(1200), updated.getTotalPrice());
        assertEquals(BigDecimal.valueOf(300), updated.getDownPayment());
        assertEquals(6, updated.getMonths());
        
        verify(installmentRepository, times(1)).deleteAll(anyList());
        verify(installmentRepository, times(1)).saveAll(anyList());
        verify(auditService, times(1)).log(eq("RECALCULATE_SALE"), any(), any(), any(), any());
    }

    @Test
    void testFullRecalculate_WithPaidInstallments() {
        Map<String, Object> body = new HashMap<>();
        body.put("totalPrice", 1200);

        when(saleRepository.findById(saleId)).thenReturn(Optional.of(sale));
        
        Installment paidInst = Installment.builder()
                .isPaid(true)
                .paidAmount(BigDecimal.valueOf(100))
                .build();
        when(installmentRepository.findBySaleIdOrderByInstallmentNoAsc(saleId))
                .thenReturn(Collections.singletonList(paidInst));

        assertThrows(BadRequestException.class, () -> saleService.fullRecalculate(saleId, body));
    }
}
