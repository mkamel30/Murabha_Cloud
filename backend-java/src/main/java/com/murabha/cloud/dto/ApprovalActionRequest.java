package com.murabha.cloud.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalActionRequest {
    private String notes;
    private String reason; // For rejection
    private String downPaymentReceipt; // For converting to sale
}