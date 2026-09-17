package com.murabha.cloud.repository;

import com.murabha.cloud.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    Optional<Customer> findByBkCodeAndCustomerType(String bkCode, String customerType);

    boolean existsByBkCodeAndCustomerType(String bkCode, String customerType);

    @Query("SELECT c FROM Customer c WHERE (:branchId IS NULL OR c.branchId = :branchId) " +
           "AND (:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.bkCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%'))) ORDER BY c.createdAt DESC")
    List<Customer> searchCustomers(@Param("branchId") UUID branchId, @Param("search") String search);

    long countByBranchId(UUID branchId);

    @Query("SELECT MAX(c.bkCode) FROM Customer c WHERE c.bkCode LIKE 'BK-%'")
    String findMaxBkCode();
}