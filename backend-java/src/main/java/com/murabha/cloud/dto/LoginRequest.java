package com.murabha.cloud.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "اسم المستخدم مطلوب")
    private String username;

    @NotBlank(message = "كلمة المرور مطلوبة")
    private String password;
}