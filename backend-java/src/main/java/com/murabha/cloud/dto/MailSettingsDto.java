package com.murabha.cloud.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MailSettingsDto {
    private String provider; // GMAIL, OFFICE365, CUSTOM
    private String host;
    private Integer port;
    private String username;
    private String password;
    private String fromEmail;
    private String fromName;
    private Boolean useTls;
    private Boolean useSsl;
    private String testRecipient;
    private String templateSubject;
    private String templateBody;
}