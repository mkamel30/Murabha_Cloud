package com.murabha.cloud.repository;

import com.murabha.cloud.entity.Installment;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public interface InstallmentRepository extends JpaRepository<Installment, UUID>, JpaSpecificationExecutor<Installment> {

    List<Installment> findBySaleIdOrderByInstallmentNoAsc(UUID saleId);

    @Override
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"sale", "sale.customer"})
    List<Installment> findAll(Specification<Installment> spec);

    default List<Installment> findOverdueInstallments(UUID branchId, LocalDate today) {
        Specification<Installment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            predicates.add(cb.isFalse(root.get("isPaid")));
            predicates.add(cb.isFalse(root.get("isWaived")));
            predicates.add(cb.lessThan(root.get("dueDate"), today));
            query.orderBy(cb.asc(root.get("dueDate")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }

    default List<Installment> findInstallmentsWithFilters(UUID branchId, UUID saleId, Boolean isPaid, LocalDate startDate, LocalDate endDate) {
        Specification<Installment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (saleId != null) predicates.add(cb.equal(root.get("saleId"), saleId));
            if (isPaid != null) predicates.add(cb.equal(root.get("isPaid"), isPaid));
            if (Boolean.FALSE.equals(isPaid)) predicates.add(cb.isFalse(root.get("isWaived")));
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), startDate));
            if (endDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), endDate));
            query.orderBy(cb.asc(root.get("dueDate")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }

    @org.springframework.data.jpa.repository.Query("SELECT SUM(i.amount - COALESCE(i.paidAmount, 0)) FROM Installment i WHERE (:branchId IS NULL OR i.branchId = :branchId) AND i.dueDate < :today AND (i.isPaid = false OR i.isPaid IS NULL) AND (i.isWaived = false OR i.isWaived IS NULL)")
    java.math.BigDecimal sumOverdueInstallments(@org.springframework.data.repository.query.Param("branchId") UUID branchId, @org.springframework.data.repository.query.Param("today") java.time.LocalDate today);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(i) FROM Installment i WHERE (:branchId IS NULL OR i.branchId = :branchId) AND i.dueDate < :today AND (i.isPaid = false OR i.isPaid IS NULL) AND (i.isWaived = false OR i.isWaived IS NULL)")
    long countOverdueInstallments(@org.springframework.data.repository.query.Param("branchId") UUID branchId, @org.springframework.data.repository.query.Param("today") java.time.LocalDate today);

    @org.springframework.data.jpa.repository.Query("SELECT SUM(i.amount - COALESCE(i.paidAmount, 0)) FROM Installment i WHERE (:branchId IS NULL OR i.branchId = :branchId) AND (i.isPaid = false OR i.isPaid IS NULL) AND (i.isWaived = false OR i.isWaived IS NULL) AND (cast(:startDate as date) IS NULL OR i.dueDate >= :startDate) AND (cast(:endDate as date) IS NULL OR i.dueDate <= :endDate)")
    java.math.BigDecimal sumInstallmentsWithFilters(@org.springframework.data.repository.query.Param("branchId") UUID branchId, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate);

    @org.springframework.data.jpa.repository.Query("SELECT i FROM Installment i WHERE (:branchId IS NULL OR i.branchId = :branchId) AND (i.isPaid = false OR i.isPaid IS NULL) AND (i.isWaived = false OR i.isWaived IS NULL) AND (cast(:startDate as date) IS NULL OR i.dueDate >= :startDate) AND (cast(:endDate as date) IS NULL OR i.dueDate <= :endDate) ORDER BY i.dueDate ASC")
    org.springframework.data.domain.Page<Installment> findUpcomingInstallments(@org.springframework.data.repository.query.Param("branchId") UUID branchId, @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate, @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate, org.springframework.data.domain.Pageable pageable);

}