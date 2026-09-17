package com.murabha.cloud.service;

import com.murabha.cloud.dto.FollowUpRequest;
import com.murabha.cloud.entity.Customer;
import com.murabha.cloud.entity.FollowUp;
import com.murabha.cloud.exception.ResourceNotFoundException;
import com.murabha.cloud.repository.CustomerRepository;
import com.murabha.cloud.repository.FollowUpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FollowUpService {

    private final FollowUpRepository followUpRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public List<FollowUp> getAll(UUID branchId, UUID customerId, Boolean isCompleted) {
        return followUpRepository.findFollowUpsWithFilters(branchId, customerId, isCompleted);
    }

    @Transactional(readOnly = true)
    public List<FollowUp> getUpcoming(UUID branchId) {
        return followUpRepository.findUpcomingFollowUps(branchId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public FollowUp getById(UUID id) {
        return followUpRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("سجل المتابعة غير موجود"));
    }

    @Transactional
    public FollowUp create(FollowUpRequest req, UUID branchId, UUID createdByUserId) {
        Customer customer = customerRepository.findById(req.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("العميل غير موجود"));

        FollowUp followUp = FollowUp.builder()
                .customerId(customer.getId())
                .note(req.getNote())
                .logs(req.getLogs() != null ? req.getLogs() : "[]")
                .nextFollowUp(req.getNextFollowUp())
                .isCompleted(false)
                .branchId(branchId != null ? branchId : customer.getBranchId())
                .createdByUserId(createdByUserId)
                .build();

        return followUpRepository.save(followUp);
    }

    @Transactional
    public FollowUp complete(UUID id) {
        FollowUp followUp = getById(id);
        followUp.setIsCompleted(true);
        followUp.setCompletedAt(Instant.now());
        return followUpRepository.save(followUp);
    }

    @Transactional
    public void delete(UUID id) {
        followUpRepository.delete(getById(id));
    }
}