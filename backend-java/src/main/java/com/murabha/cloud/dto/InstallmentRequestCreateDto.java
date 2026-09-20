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
    @jakarta.validation.constraints.DecimalMin(value = "0.0", inclusive = false, message = "إجمالي المبلغ يجب أن يكون أكبر من الصفر")
    private BigDecimal totalPrice;

    @jakarta.validation.constraints.DecimalMin(value = "0.0", message = "المقدم لا يمكن أن يكون سالباً")
    private BigDecimal downPayment;

    @NotNull(message = "عدد الأشهر مطلوب")
    @jakarta.validation.constraints.Min(value = 1, message = "عدد الأشهر يجب أن يكون 1 على الأقل")
    private Integer months;

    @jakarta.validation.constraints.DecimalMin(value = "0.0", inclusive = false, message = "مبلغ القسط يجب أن يكون أكبر من الصفر")
    private BigDecimal installmentAmount;
    private String paymentPlace;
    private String notes;
}