package com.murabha.cloud.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUpRequest {
    @NotNull(message = "معرف العميل مطلوب")
    private UUID customerId;

    @NotBlank(message = "ملاحظة المتابعة مطلوبة")
    private String note;

    private LocalDate nextFollowUp;
    private String logs;
}