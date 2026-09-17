package com.murabha.cloud.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleCreateRequest {
    @NotNull(message = "معرف العميل مطلوب")
    private UUID customerId;

    @NotBlank(message = "رقم الماكينة مطلوب")
    private String machineSerial;

    private String saleType; // INSTALLMENT or CASH

    @NotNull(message = "إجمالي السعر مطلوب")
    private BigDecimal totalPrice;

    private BigDecimal downPayment;
    private BigDecimal actualPaidAmount;
    private String downPaymentReceipt;
    private String paymentPlace;
    private String notes;

    @NotNull(message = "تاريخ البيع مطلوب")
    private LocalDate saleDate;

    private LocalDate firstDueDate;
    private Integer months;
    private BigDecimal installmentAmount;
}