package com.murabha.cloud.repository;

import com.murabha.cloud.entity.FollowUp;
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
public interface FollowUpRepository extends JpaRepository<FollowUp, UUID>, JpaSpecificationExecutor<FollowUp> {

    List<FollowUp> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    default List<FollowUp> findFollowUpsWithFilters(UUID branchId, UUID customerId, Boolean isCompleted) {
        Specification<FollowUp> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (customerId != null) predicates.add(cb.equal(root.get("customerId"), customerId));
            if (isCompleted != null) predicates.add(cb.equal(root.get("isCompleted"), isCompleted));
            query.orderBy(cb.asc(root.get("nextFollowUp")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }

    default List<FollowUp> findUpcomingFollowUps(UUID branchId, LocalDate today) {
        Specification<FollowUp> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            predicates.add(cb.isFalse(root.get("isCompleted")));
            if (today != null) predicates.add(cb.lessThanOrEqualTo(root.get("nextFollowUp"), today));
            query.orderBy(cb.asc(root.get("nextFollowUp")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }
}