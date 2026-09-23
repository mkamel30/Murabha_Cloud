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
    @jakarta.validation.constraints.DecimalMin(value = "0.0", inclusive = false, message = "المبلغ يجب أن يكون أكبر من الصفر")
    private BigDecimal amount;
    private String paymentType;
    private String paymentPlace;
    private String notes;
    private String receiptNumber;

    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.murabha.cloud.config.FlexibleInstantDeserializer.class)
    private Instant paidAt;
    private List<UUID> installmentIds;
}