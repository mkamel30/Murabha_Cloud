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
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), startDate));
            if (endDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), endDate));
            query.orderBy(cb.asc(root.get("dueDate")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }
}