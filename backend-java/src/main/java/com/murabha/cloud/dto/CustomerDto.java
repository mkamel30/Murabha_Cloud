package com.murabha.cloud.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerDto {
    private UUID id;
    @NotBlank(message = "كود العميل مطلوب")
    private String bkCode;
    private String customerType;
    @NotBlank(message = "اسم العميل مطلوب")
    private String name;
    private String phone;
    private String address;
    private String notes;
    private String department;
    private UUID branchId;
    private Instant createdAt;
    private Instant updatedAt;
    private List<SaleSummaryDto> sales;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SaleSummaryDto {
        private UUID id;
    }
}