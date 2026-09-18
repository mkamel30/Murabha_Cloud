package com.murabha.cloud.repository;

import com.murabha.cloud.entity.Payment;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID>, JpaSpecificationExecutor<Payment> {

    Optional<Payment> findByReceiptNumber(String receiptNumber);

    boolean existsByReceiptNumber(String receiptNumber);

    List<Payment> findBySaleIdOrderByPaidAtAsc(UUID saleId);

    default List<Payment> findPaymentsWithFilters(UUID branchId, UUID saleId, Instant startDate, Instant endDate) {
        Specification<Payment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (saleId != null) predicates.add(cb.equal(root.get("saleId"), saleId));
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("paidAt"), startDate));
            if (endDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("paidAt"), endDate));
            query.orderBy(cb.desc(root.get("paidAt")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }
}