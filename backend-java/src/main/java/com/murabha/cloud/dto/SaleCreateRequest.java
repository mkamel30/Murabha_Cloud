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
    @jakarta.validation.constraints.DecimalMin(value = "0.0", inclusive = false, message = "إجمالي السعر يجب أن يكون أكبر من الصفر")
    private BigDecimal totalPrice;

    @jakarta.validation.constraints.DecimalMin(value = "0.0", message = "لا يمكن أن يكون المقدم سالباً")
    private BigDecimal downPayment;
    
    @jakarta.validation.constraints.DecimalMin(value = "0.0", message = "المبلغ المدفوع الفعلي لا يمكن أن يكون سالباً")
    private BigDecimal actualPaidAmount;
    
    private String downPaymentReceipt;
    private String paymentPlace;
    private String notes;

    @NotNull(message = "تاريخ البيع مطلوب")
    private LocalDate saleDate;

    private LocalDate firstDueDate;
    
    @jakarta.validation.constraints.Min(value = 1, message = "عدد الأشهر يجب أن يكون 1 على الأقل")
    private Integer months;
    
    @jakarta.validation.constraints.DecimalMin(value = "0.0", inclusive = false, message = "مبلغ القسط يجب أن يكون أكبر من الصفر")
    private BigDecimal installmentAmount;
}