package com.murabha.cloud.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstallmentRequestCreateDto {

    @NotNull(message = "معرف العميل مطلوب")
    private UUID customerId;

    @NotBlank(message = "رقم الماكينة مطلوب")
    private String machineSerial;

    @NotNull(message = "إجمالي المبلغ مطلوب")
    private BigDecimal totalPrice;

    private BigDecimal downPayment;

    @NotNull(message = "عدد الأشهر مطلوب")
    private Integer months;

    private BigDecimal installmentAmount;
    private String paymentPlace;
    private String notes;
}