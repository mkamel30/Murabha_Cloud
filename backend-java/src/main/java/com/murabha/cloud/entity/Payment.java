package com.murabha.cloud.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "payments", indexes = {
    @Index(name = "idx_payment_sale_id", columnList = "sale_id"),
    @Index(name = "idx_payment_paid_at", columnList = "paid_at"),
    @Index(name = "idx_payment_receipt", columnList = "receipt_number"),
    @Index(name = "idx_payment_branch_id", columnList = "branch_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "receipt_number", nullable = false, length = 64)
    private String receiptNumber;

    @Column(name = "sale_id", nullable = false)
    private UUID saleId;

    @JsonIgnoreProperties({"installments", "payments", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", insertable = false, updatable = false)
    private MachineSale sale;

    @Column(name = "payment_type", nullable = false, length = 32)
    private String paymentType; // DOWN_PAYMENT, INSTALLMENT, FULL_PAYMENT, REWARD, QUICK_PAY

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_place", length = 64)
    private String paymentPlace;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt;

    @Column(name = "branch_id")
    private UUID branchId;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", insertable = false, updatable = false)
    private Branch branch;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @JsonIgnoreProperties({"payment", "sale", "hibernateLazyInitializer", "handler"})
    @Builder.Default
    @OneToMany(mappedBy = "payment", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    private List<Installment> installments = new ArrayList<>();

    @Builder.Default
    @Column(name = "is_voided")
    private Boolean isVoided = false;

    @Column(name = "void_reason")
    private String voidReason;

    @Column(name = "voided_at")
    private Instant voidedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}