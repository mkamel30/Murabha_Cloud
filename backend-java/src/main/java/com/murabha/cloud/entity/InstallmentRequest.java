package com.murabha.cloud.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "installment_requests", indexes = {
    @Index(name = "idx_req_number", columnList = "request_number", unique = true),
    @Index(name = "idx_req_branch_id", columnList = "branch_id"),
    @Index(name = "idx_req_status", columnList = "status"),
    @Index(name = "idx_req_customer_id", columnList = "customer_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class InstallmentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "request_number", nullable = false, unique = true, length = 64)
    private String requestNumber;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @JsonIgnoreProperties({"sales", "followUps", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", insertable = false, updatable = false)
    private Customer customer;

    @Column(name = "machine_serial", nullable = false, length = 64)
    private String machineSerial;

    @Column(name = "total_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Builder.Default
    @Column(name = "down_payment", nullable = false, precision = 12, scale = 2)
    private BigDecimal downPayment = BigDecimal.ZERO;

    @Column(name = "months", nullable = false)
    private Integer months;

    @Column(name = "installment_amount", precision = 12, scale = 2)
    private BigDecimal installmentAmount;

    @Column(name = "payment_place", length = 64)
    private String paymentPlace;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Builder.Default
    @Column(nullable = false, length = 32)
    private String status = "PENDING_SUPERVISOR"; // PENDING_SUPERVISOR, PENDING_MANAGER, APPROVED, REJECTED, CONVERTED_TO_SALE

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Builder.Default
    @Column(name = "approval_history", columnDefinition = "TEXT")
    private String approvalHistory = "[]";

    @Column(name = "down_payment_receipt", length = 64)
    private String downPaymentReceipt;

    @Column(name = "sale_id")
    private UUID saleId;

    @Column(name = "branch_id")
    private UUID branchId;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "branch_id", insertable = false, updatable = false)
    private Branch branch;

    @Column(name = "requested_by_user_id")
    private UUID requestedByUserId;

    @Column(name = "requested_by_user_name", length = 128)
    private String requestedByUserName;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}