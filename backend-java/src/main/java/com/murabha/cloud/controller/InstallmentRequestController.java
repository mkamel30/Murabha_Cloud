package com.murabha.cloud.controller;

import com.murabha.cloud.dto.ApprovalActionRequest;
import com.murabha.cloud.dto.InstallmentRequestCreateDto;
import com.murabha.cloud.entity.InstallmentRequest;
import com.murabha.cloud.entity.MachineSale;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.security.UserPrincipal;
import com.murabha.cloud.service.InstallmentRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/installment-requests")
@RequiredArgsConstructor
public class InstallmentRequestController {

    private final InstallmentRequestService requestService;

    @PostMapping
    public ResponseEntity<InstallmentRequest> create(
            @Valid @RequestBody InstallmentRequestCreateDto dto,
            @AuthenticationPrincipal UserPrincipal requester) {
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.create(dto, requester));
    }

    @GetMapping
    public ResponseEntity<List<InstallmentRequest>> getAll(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(requestService.getAll(BranchContext.getBranchId(), status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InstallmentRequest> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(requestService.getById(id));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR')")
    public ResponseEntity<InstallmentRequest> approve(
            @PathVariable UUID id,
            @RequestBody(required = false) ApprovalActionRequest action,
            @AuthenticationPrincipal UserPrincipal reviewer) {
        if (action == null) action = new ApprovalActionRequest();
        return ResponseEntity.ok(requestService.approve(id, action, reviewer));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER', 'BRANCH_SUPERVISOR')")
    public ResponseEntity<InstallmentRequest> reject(
            @PathVariable UUID id,
            @Valid @RequestBody ApprovalActionRequest action,
            @AuthenticationPrincipal UserPrincipal reviewer) {
        return ResponseEntity.ok(requestService.reject(id, action, reviewer));
    }

    @PostMapping("/{id}/convert-to-sale")
    public ResponseEntity<MachineSale> convertToSale(
            @PathVariable UUID id,
            @Valid @RequestBody ApprovalActionRequest action,
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.convertToSale(id, action, user));
    }
}