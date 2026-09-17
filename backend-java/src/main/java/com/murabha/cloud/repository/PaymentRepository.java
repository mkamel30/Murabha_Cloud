package com.murabha.cloud.repository;

import com.murabha.cloud.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByReceiptNumber(String receiptNumber);

    boolean existsByReceiptNumber(String receiptNumber);

    List<Payment> findBySaleIdOrderByPaidAtAsc(UUID saleId);

    @Query("SELECT p FROM Payment p WHERE (:branchId IS NULL OR p.branchId = :branchId) " +
           "AND (:saleId IS NULL OR p.saleId = :saleId) " +
           "AND (:startDate IS NULL OR p.paidAt >= :startDate) " +
           "AND (:endDate IS NULL OR p.paidAt <= :endDate) ORDER BY p.paidAt DESC")
    List<Payment> findPaymentsWithFilters(
            @Param("branchId") UUID branchId,
            @Param("saleId") UUID saleId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate);
}