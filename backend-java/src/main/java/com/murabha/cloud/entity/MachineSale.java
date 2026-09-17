package com.murabha.cloud.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "machine_sales", indexes = {
    @Index(name = "idx_sale_customer_id", columnList = "customer_id"),
    @Index(name = "idx_sale_date", columnList = "sale_date"),
    @Index(name = "idx_sale_status", columnList = "status"),
    @Index(name = "idx_sale_receipt", columnList = "receipt_number", unique = true),
    @Index(name = "idx_sale_serial", columnList = "machine_serial"),
    @Index(name = "idx_sale_branch_id", columnList = "branch_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class MachineSale {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "receipt_number", nullable = false, unique = true, length = 64)
    private String receiptNumber;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @JsonIgnoreProperties({"sales", "followUps", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", insertable = false, updatable = false)
    private Customer customer;

    @Column(name = "machine_serial", nullable = false, length = 64)
    private String machineSerial;

    @Builder.Default
    @Column(name = "sale_type", nullable = false, length = 32)
    private String saleType = "INSTALLMENT"; // INSTALLMENT or CASH

    @Column(name = "total_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Builder.Default
    @Column(name = "down_payment", nullable = false, precision = 12, scale = 2)
    private BigDecimal downPayment = BigDecimal.ZERO;

    @Column(name = "down_payment_receipt", length = 64)
    private String downPaymentReceipt;

    @Builder.Default
    @Column(name = "paid_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "remaining_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal remainingAmount;

    @Column(name = "payment_place", length = 64)
    private String paymentPlace;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "sale_date", nullable = false)
    private LocalDate saleDate;

    @Column(name = "first_due_date")
    private LocalDate firstDueDate;

    private Integer months;

    @Builder.Default
    @Column(nullable = false, length = 32)
    private String status = "ACTIVE"; // ACTIVE, COMPLETED, VOIDED

    @Column(name = "void_reason")
    private String voidReason;

    @Column(name = "voided_at")
    private Instant voidedAt;

    @Column(name = "branch_id")
    private UUID branchId;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", insertable = false, updatable = false)
    private Branch branch;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @JsonIgnoreProperties({"sale", "hibernateLazyInitializer", "handler"})
    @Builder.Default
    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("installmentNo ASC")
    private List<Installment> installments = new ArrayList<>();

    @JsonIgnoreProperties({"sale", "hibernateLazyInitializer", "handler"})
    @Builder.Default
    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = false)
    @OrderBy("paidAt ASC")
    private List<Payment> payments = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}