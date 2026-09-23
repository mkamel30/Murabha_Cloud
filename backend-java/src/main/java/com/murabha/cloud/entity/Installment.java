package com.murabha.cloud.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "installments", indexes = {
    @Index(name = "idx_installment_sale_id", columnList = "sale_id"),
    @Index(name = "idx_installment_due_date", columnList = "due_date"),
    @Index(name = "idx_installment_is_paid", columnList = "is_paid"),
    @Index(name = "idx_installment_payment_id", columnList = "payment_id"),
    @Index(name = "idx_installment_branch_id", columnList = "branch_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Installment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "sale_id", nullable = false)
    private UUID saleId;

    @JsonIgnoreProperties({"installments", "payments", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", insertable = false, updatable = false)
    private MachineSale sale;

    @Column(name = "payment_id")
    private UUID paymentId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", insertable = false, updatable = false)
    private Payment payment;

    @Column(name = "installment_no", nullable = false)
    private Integer installmentNo;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    @Column(name = "paid_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "is_paid", nullable = false)
    private Boolean isPaid = false;

    @Builder.Default
    @Column(name = "is_waived", nullable = false)
    private Boolean isWaived = false;

    @Column(name = "waive_reason")
    private String waiveReason;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "receipt_number", length = 64)
    private String receiptNumber;

    @Column(name = "payment_place", length = 64)
    private String paymentPlace;

    @Column(name = "branch_id")
    private UUID branchId;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", insertable = false, updatable = false)
    private Branch branch;

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