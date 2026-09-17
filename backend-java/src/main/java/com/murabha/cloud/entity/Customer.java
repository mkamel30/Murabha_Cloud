package com.murabha.cloud.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "customers", uniqueConstraints = {
    @UniqueConstraint(name = "uq_customer_bk_type", columnNames = {"bk_code", "customer_type"})
}, indexes = {
    @Index(name = "idx_customer_bk_code", columnList = "bk_code"),
    @Index(name = "idx_customer_name", columnList = "name"),
    @Index(name = "idx_customer_phone", columnList = "phone"),
    @Index(name = "idx_customer_branch_id", columnList = "branch_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "bk_code", nullable = false, length = 32)
    private String bkCode;

    @Builder.Default
    @Column(name = "customer_type", nullable = false, length = 32)
    private String customerType = "عام";

    @Column(nullable = false, length = 128)
    private String name;

    @Column(length = 32)
    private String phone;

    @Column(length = 255)
    private String address;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 64)
    private String department;

    @Column(name = "branch_id")
    private UUID branchId;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", insertable = false, updatable = false)
    private Branch branch;

    @JsonIgnoreProperties({"customer", "hibernateLazyInitializer", "handler"})
    @Builder.Default
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = false)
    private List<MachineSale> sales = new ArrayList<>();

    @JsonIgnoreProperties({"customer", "hibernateLazyInitializer", "handler"})
    @Builder.Default
    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FollowUp> followUps = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}