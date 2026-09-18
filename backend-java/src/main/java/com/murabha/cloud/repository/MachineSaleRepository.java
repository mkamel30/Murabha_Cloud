package com.murabha.cloud.repository;

import com.murabha.cloud.entity.MachineSale;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MachineSaleRepository extends JpaRepository<MachineSale, UUID>, JpaSpecificationExecutor<MachineSale> {

    Optional<MachineSale> findByReceiptNumber(String receiptNumber);

    boolean existsByReceiptNumber(String receiptNumber);

    List<MachineSale> findByMachineSerialIgnoreCaseAndStatusNot(String machineSerial, String status);

    List<MachineSale> findByCustomerIdOrderBySaleDateDesc(UUID customerId);

    default Page<MachineSale> findSalesWithFilters(UUID branchId, UUID customerId, String status, String saleType,
                                                  LocalDate startDate, LocalDate endDate, Pageable pageable) {
        Specification<MachineSale> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (customerId != null) predicates.add(cb.equal(root.get("customerId"), customerId));
            if (status != null && !status.isBlank()) predicates.add(cb.equal(root.get("status"), status));
            if (saleType != null && !saleType.isBlank()) predicates.add(cb.equal(root.get("saleType"), saleType));
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("saleDate"), startDate));
            if (endDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("saleDate"), endDate));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec, pageable);
    }

    default List<MachineSale> findSalesForReport(UUID branchId, LocalDate startDate, LocalDate endDate, String saleType) {
        Specification<MachineSale> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("saleDate"), startDate));
            if (endDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("saleDate"), endDate));
            if (saleType != null && !saleType.isBlank()) predicates.add(cb.equal(root.get("saleType"), saleType));
            query.orderBy(cb.desc(root.get("saleDate")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }
}