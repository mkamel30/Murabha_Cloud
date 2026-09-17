package com.murabha.cloud.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    @NotNull(message = "المبلغ مطلوب")
    private BigDecimal amount;
    private String paymentType;
    private String paymentPlace;
    private String notes;
    private String receiptNumber;
    private Instant paidAt;
    private List<UUID> installmentIds;
}