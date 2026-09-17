package com.murabha.cloud.repository;

import com.murabha.cloud.entity.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface FollowUpRepository extends JpaRepository<FollowUp, UUID> {

    List<FollowUp> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    @Query("SELECT f FROM FollowUp f WHERE (:branchId IS NULL OR f.branchId = :branchId) " +
           "AND (:customerId IS NULL OR f.customerId = :customerId) " +
           "AND (:isCompleted IS NULL OR f.isCompleted = :isCompleted) ORDER BY f.nextFollowUp ASC")
    List<FollowUp> findFollowUpsWithFilters(
            @Param("branchId") UUID branchId,
            @Param("customerId") UUID customerId,
            @Param("isCompleted") Boolean isCompleted);

    @Query("SELECT f FROM FollowUp f WHERE (:branchId IS NULL OR f.branchId = :branchId) " +
           "AND f.isCompleted = false AND f.nextFollowUp <= :today ORDER BY f.nextFollowUp ASC")
    List<FollowUp> findUpcomingFollowUps(@Param("branchId") UUID branchId, @Param("today") LocalDate today);
}