package com.murabha.cloud.repository;

import com.murabha.cloud.entity.MachineSale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MachineSaleRepository extends JpaRepository<MachineSale, UUID> {

    Optional<MachineSale> findByReceiptNumber(String receiptNumber);

    boolean existsByReceiptNumber(String receiptNumber);

    List<MachineSale> findByMachineSerialIgnoreCaseAndStatusNot(String machineSerial, String status);

    @Query("SELECT s FROM MachineSale s WHERE (:branchId IS NULL OR s.branchId = :branchId) " +
           "AND (:customerId IS NULL OR s.customerId = :customerId) " +
           "AND (:status IS NULL OR s.status = :status) " +
           "AND (:saleType IS NULL OR s.saleType = :saleType) " +
           "AND (:startDate IS NULL OR s.saleDate >= :startDate) " +
           "AND (:endDate IS NULL OR s.saleDate <= :endDate)")
    Page<MachineSale> findSalesWithFilters(
            @Param("branchId") UUID branchId,
            @Param("customerId") UUID customerId,
            @Param("status") String status,
            @Param("saleType") String saleType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    @Query("SELECT s FROM MachineSale s WHERE (:branchId IS NULL OR s.branchId = :branchId) " +
           "AND (:startDate IS NULL OR s.saleDate >= :startDate) " +
           "AND (:endDate IS NULL OR s.saleDate <= :endDate) " +
           "AND (:saleType IS NULL OR s.saleType = :saleType) ORDER BY s.saleDate DESC")
    List<MachineSale> findSalesForReport(
            @Param("branchId") UUID branchId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("saleType") String saleType);

    List<MachineSale> findByCustomerIdOrderBySaleDateDesc(UUID customerId);
}