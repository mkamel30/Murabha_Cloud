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
            predicates.add(cb.or(cb.isNull(root.get("isVoided")), cb.isFalse(root.get("isVoided"))));
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (saleId != null) predicates.add(cb.equal(root.get("saleId"), saleId));
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("paidAt"), startDate));
            if (endDate != null) predicates.add(cb.lessThanOrEqualTo(root.get("paidAt"), endDate));
            query.orderBy(cb.desc(root.get("paidAt")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }

    @org.springframework.data.jpa.repository.Query("SELECT SUM(p.amount) FROM Payment p WHERE (p.isVoided IS NULL OR p.isVoided = false) AND (:branchId IS NULL OR p.branchId = :branchId) AND (cast(:startDate as timestamp) IS NULL OR p.paidAt >= :startDate) AND (cast(:endDate as timestamp) IS NULL OR p.paidAt <= :endDate)")
    java.math.BigDecimal sumPaymentsWithFilters(@org.springframework.data.repository.query.Param("branchId") UUID branchId, @org.springframework.data.repository.query.Param("startDate") Instant startDate, @org.springframework.data.repository.query.Param("endDate") Instant endDate);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(p) FROM Payment p WHERE (p.isVoided IS NULL OR p.isVoided = false) AND (:branchId IS NULL OR p.branchId = :branchId) AND (cast(:startDate as timestamp) IS NULL OR p.paidAt >= :startDate) AND (cast(:endDate as timestamp) IS NULL OR p.paidAt <= :endDate)")
    long countPaymentsWithFilters(@org.springframework.data.repository.query.Param("branchId") UUID branchId, @org.springframework.data.repository.query.Param("startDate") Instant startDate, @org.springframework.data.repository.query.Param("endDate") Instant endDate);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Payment p WHERE (p.isVoided IS NULL OR p.isVoided = false) AND (:branchId IS NULL OR p.branchId = :branchId) ORDER BY p.paidAt DESC")
    org.springframework.data.domain.Page<Payment> findRecentPayments(@org.springframework.data.repository.query.Param("branchId") UUID branchId, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT p.paymentPlace, SUM(p.amount) FROM Payment p WHERE (p.isVoided IS NULL OR p.isVoided = false) AND (:branchId IS NULL OR p.branchId = :branchId) GROUP BY p.paymentPlace")
    List<Object[]> sumByPaymentPlace(@org.springframework.data.repository.query.Param("branchId") UUID branchId);
}