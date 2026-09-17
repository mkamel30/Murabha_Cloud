package com.murabha.cloud.repository;

import com.murabha.cloud.entity.InstallmentRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstallmentRequestRepository extends JpaRepository<InstallmentRequest, UUID> {

    Optional<InstallmentRequest> findByRequestNumber(String requestNumber);

    @Query("SELECT r FROM InstallmentRequest r WHERE (:branchId IS NULL OR r.branchId = :branchId) " +
           "AND (:status IS NULL OR r.status = :status) " +
           "ORDER BY r.createdAt DESC")
    List<InstallmentRequest> findWithFilters(@Param("branchId") UUID branchId, @Param("status") String status);

    long countByBranchIdAndStatus(UUID branchId, String status);

    @Query("SELECT COUNT(r) FROM InstallmentRequest r WHERE (:branchId IS NULL OR r.branchId = :branchId) " +
           "AND r.status IN ('PENDING_SUPERVISOR', 'PENDING_MANAGER')")
    long countPendingByBranch(@Param("branchId") UUID branchId);
}