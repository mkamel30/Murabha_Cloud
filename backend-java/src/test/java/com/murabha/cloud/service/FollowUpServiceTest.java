package com.murabha.cloud.service;

import com.murabha.cloud.dto.FollowUpRequest;
import com.murabha.cloud.entity.Customer;
import com.murabha.cloud.entity.FollowUp;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.FollowUpRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FollowUpServiceTest {

    @Mock
    private FollowUpRepository followUpRepository;

    @Mock
    private CustomerRepository customerRepository;

    @InjectMocks
    private FollowUpService followUpService;

    private UUID customerId;
    private UUID followUpId;
    private UUID branchId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();
        followUpId = UUID.randomUUID();
        branchId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void testCreate_Success() {
        FollowUpRequest req = new FollowUpRequest();
        req.setCustomerId(customerId);
        req.setNote("Test note");
        req.setNextFollowUp(LocalDate.now().plusDays(2));

        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setBranchId(branchId);

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(followUpRepository.save(any(FollowUp.class))).thenAnswer(invocation -> {
            FollowUp f = invocation.getArgument(0);
            f.setId(UUID.randomUUID());
            return f;
        });

        FollowUp result = followUpService.create(req, branchId, userId);

        assertNotNull(result);
        assertEquals(customerId, result.getCustomerId());
        assertEquals("Test note", result.getNote());
        assertEquals(branchId, result.getBranchId());
        verify(followUpRepository, times(1)).save(any(FollowUp.class));
    }

    @Test
    void testCreate_CustomerNotFound() {
        FollowUpRequest req = new FollowUpRequest();
        req.setCustomerId(customerId);

        when(customerRepository.findById(customerId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> followUpService.create(req, branchId, userId));
        verify(followUpRepository, never()).save(any(FollowUp.class));
    }

    @Test
    void testUpdate_Success() {
        FollowUp followUp = FollowUp.builder()
                .id(followUpId)
                .note("Old note")
                .branchId(branchId)
                .build();

        FollowUpRequest req = new FollowUpRequest();
        req.setNote("New note");
        req.setLogs("New logs");
        req.setNextFollowUp(LocalDate.now().plusDays(5));

        when(followUpRepository.findById(followUpId)).thenReturn(Optional.of(followUp));
        when(followUpRepository.save(any(FollowUp.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FollowUp result = followUpService.update(followUpId, req);

        assertEquals("New note", result.getNote());
        assertEquals("New logs", result.getLogs());
        assertEquals(req.getNextFollowUp(), result.getNextFollowUp());
        verify(followUpRepository, times(1)).save(followUp);
    }

    @Test
    void testComplete_Success() {
        FollowUp followUp = FollowUp.builder()
                .id(followUpId)
                .isCompleted(false)
                .branchId(branchId)
                .build();

        when(followUpRepository.findById(followUpId)).thenReturn(Optional.of(followUp));
        when(followUpRepository.save(any(FollowUp.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FollowUp result = followUpService.complete(followUpId);

        assertTrue(result.getIsCompleted());
        assertNotNull(result.getCompletedAt());
        verify(followUpRepository, times(1)).save(followUp);
    }
}
