package com.murabha.cloud.controller;

import com.murabha.cloud.dto.CustomerDto;
import com.murabha.cloud.entity.Customer;
import com.murabha.cloud.security.BranchContext;
import com.murabha.cloud.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<List<CustomerDto>> getAll(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(customerService.getAll(search, BranchContext.getBranchId()));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getCount() {
        return ResponseEntity.ok(Map.of("count", customerService.getCount(BranchContext.getBranchId())));
    }

    @GetMapping("/generate-bkcode")
    public ResponseEntity<Map<String, String>> generateBkCode() {
        return ResponseEntity.ok(Map.of("bkCode", customerService.generateBkCode()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(customerService.getById(id));
    }

    @PostMapping
    public ResponseEntity<CustomerDto> create(@Valid @RequestBody CustomerDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerService.create(dto, BranchContext.getBranchId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerDto> update(@PathVariable UUID id, @RequestBody CustomerDto dto) {
        return ResponseEntity.ok(customerService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'HQ_MANAGER')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        customerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}