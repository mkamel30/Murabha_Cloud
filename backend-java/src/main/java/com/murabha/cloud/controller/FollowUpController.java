package com.murabha.cloud.controller;

import com.murabha.cloud.dto.FollowUpRequest;
import com.murabha.cloud.entity.FollowUp;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.security.UserPrincipal;
import com.murabha.cloud.service.FollowUpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/followups")
@RequiredArgsConstructor
public class FollowUpController {

    private final FollowUpService followUpService;

    @GetMapping
    public ResponseEntity<List<FollowUp>> getAll(
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) Boolean isCompleted) {
        return ResponseEntity.ok(followUpService.getAll(BranchContext.getBranchId(), customerId, isCompleted));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<FollowUp>> getUpcoming() {
        return ResponseEntity.ok(followUpService.getUpcoming(BranchContext.getBranchId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FollowUp> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(followUpService.getById(id));
    }

    @PostMapping
    public ResponseEntity<FollowUp> create(
            @Valid @RequestBody FollowUpRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(followUpService.create(req, BranchContext.getBranchId(), principal.getId()));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<FollowUp> complete(@PathVariable UUID id) {
        return ResponseEntity.ok(followUpService.complete(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        followUpService.delete(id);
        return ResponseEntity.noContent().build();
    }
}