package com.murabha.cloud.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowSettingsDto {
    @Builder.Default
    private String mode = "TWO_LEVEL"; // ONE_LEVEL, TWO_LEVEL, THRESHOLD

    @Builder.Default
    private BigDecimal thresholdAmount = new BigDecimal("15000.00");

    @Builder.Default
    private Boolean requireSupervisor = true;

    @Builder.Default
    private Boolean requireBranchManager = true;
}