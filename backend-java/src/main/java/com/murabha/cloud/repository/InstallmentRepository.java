package com.murabha.cloud.repository;

import com.murabha.cloud.entity.Installment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface InstallmentRepository extends JpaRepository<Installment, UUID> {

    List<Installment> findBySaleIdOrderByInstallmentNoAsc(UUID saleId);

    @Query("SELECT i FROM Installment i WHERE (:branchId IS NULL OR i.branchId = :branchId) " +
           "AND i.isPaid = false AND i.isWaived = false AND i.dueDate < :today ORDER BY i.dueDate ASC")
    List<Installment> findOverdueInstallments(@Param("branchId") UUID branchId, @Param("today") LocalDate today);

    @Query("SELECT i FROM Installment i WHERE (:branchId IS NULL OR i.branchId = :branchId) " +
           "AND (:saleId IS NULL OR i.saleId = :saleId) " +
           "AND (:isPaid IS NULL OR i.isPaid = :isPaid) " +
           "AND (:startDate IS NULL OR i.dueDate >= :startDate) " +
           "AND (:endDate IS NULL OR i.dueDate <= :endDate) ORDER BY i.dueDate ASC")
    List<Installment> findInstallmentsWithFilters(
            @Param("branchId") UUID branchId,
            @Param("saleId") UUID saleId,
            @Param("isPaid") Boolean isPaid,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}