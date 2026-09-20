package com.murabha.cloud.service;

import com.murabha.cloud.entity.Installment;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.entity.Payment;
import com.murabha.cloud.exception.BadRequestException;
import com.murabha.cloud.exception.ResourceNotFoundException;
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
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private MachineSaleRepository saleRepository;

    @Mock
    private InstallmentRepository installmentRepository;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private PaymentService paymentService;

    private UUID paymentId;
    private UUID saleId;
    private UUID branchId;
    private Payment payment;
    private MachineSale sale;

    @BeforeEach
    void setUp() {
        paymentId = UUID.randomUUID();
        saleId = UUID.randomUUID();
        branchId = UUID.randomUUID();

        payment = Payment.builder()
                .id(paymentId)
                .saleId(saleId)
                .branchId(branchId)
                .amount(BigDecimal.valueOf(100))
                .isVoided(false)
                .build();

        sale = MachineSale.builder()
                .id(saleId)
                .branchId(branchId)
                .paidAmount(BigDecimal.valueOf(500))
                .remainingAmount(BigDecimal.valueOf(500))
                .status("ACTIVE")
                .build();
    }

    @Test
    void testUpdate_Success() {
        Map<String, Object> updates = new HashMap<>();
        updates.put("receiptNumber", "REC-123");
        updates.put("paymentPlace", "Bank");
        updates.put("notes", "Test notes");

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Payment result = paymentService.update(paymentId, updates);

        assertEquals("REC-123", result.getReceiptNumber());
        assertEquals("Bank", result.getPaymentPlace());
        assertEquals("Test notes", result.getNotes());
        verify(paymentRepository, times(1)).save(payment);
    }

    @Test
    void testVoidPayment_Success() {
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(saleRepository.findById(saleId)).thenReturn(Optional.of(sale));

        Installment installment = Installment.builder()
                .id(UUID.randomUUID())
                .saleId(saleId)
                .paymentId(paymentId)
                .paidAmount(BigDecimal.valueOf(100))
                .isPaid(true)
                .build();
        
        when(installmentRepository.findBySaleIdOrderByInstallmentNoAsc(saleId))
                .thenReturn(Collections.singletonList(installment));
        when(installmentRepository.save(any(Installment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(saleRepository.save(any(MachineSale.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentService.voidPayment(paymentId, "Mistake");

        assertTrue(payment.getIsVoided());
        assertEquals("Mistake", payment.getVoidReason());
        assertNotNull(payment.getVoidedAt());

        assertEquals(BigDecimal.valueOf(400), sale.getPaidAmount());
        assertEquals(BigDecimal.valueOf(600), sale.getRemainingAmount());
        assertEquals("ACTIVE", sale.getStatus());

        assertEquals(BigDecimal.ZERO, installment.getPaidAmount());
        assertFalse(installment.getIsPaid());
        assertNull(installment.getPaymentId());

        verify(auditService, times(1)).log(eq("VOID_PAYMENT"), any(), any(), any(), any());
    }

    @Test
    void testVoidPayment_AlreadyVoided() {
        payment.setIsVoided(true);
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));

        assertThrows(BadRequestException.class, () -> paymentService.voidPayment(paymentId, "Mistake"));
        verify(saleRepository, never()).findById(any());
    }

    @Test
    void testVoidPayment_SaleNotFound() {
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(saleRepository.findById(saleId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> paymentService.voidPayment(paymentId, "Mistake"));
        verify(installmentRepository, never()).findBySaleIdOrderByInstallmentNoAsc(any());
    }
}
