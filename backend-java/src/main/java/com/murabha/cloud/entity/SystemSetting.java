package com.murabha.cloud.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemSetting {

    @Id
    @Column(name = "\"key\"", length = 64)
    private String key;

    @Column(name = "\"value\"", nullable = false, columnDefinition = "TEXT")
    private String value;

    @Column(length = 255)
    private String description;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}