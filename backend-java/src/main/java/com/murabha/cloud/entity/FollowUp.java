package com.murabha.cloud.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "follow_ups", indexes = {
    @Index(name = "idx_followup_customer_id", columnList = "customer_id"),
    @Index(name = "idx_followup_next_date", columnList = "next_follow_up"),
    @Index(name = "idx_followup_is_completed", columnList = "is_completed"),
    @Index(name = "idx_followup_branch_id", columnList = "branch_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @JsonIgnoreProperties({"followUps", "sales", "hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", insertable = false, updatable = false)
    private Customer customer;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String note;

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String logs = "[]";

    @Column(name = "next_follow_up")
    private LocalDate nextFollowUp;

    @Builder.Default
    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted = false;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "branch_id")
    private UUID branchId;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", insertable = false, updatable = false)
    private Branch branch;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;
}