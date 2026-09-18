package com.murabha.cloud.repository;

import com.murabha.cloud.entity.Customer;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID>, JpaSpecificationExecutor<Customer> {

    Optional<Customer> findByBkCodeAndCustomerType(String bkCode, String customerType);

    boolean existsByBkCodeAndCustomerType(String bkCode, String customerType);

    long countByBranchId(UUID branchId);

    @Query("SELECT MAX(c.bkCode) FROM Customer c WHERE c.bkCode LIKE 'BK-%'")
    String findMaxBkCode();

    default List<Customer> searchCustomers(UUID branchId, String search) {
        Specification<Customer> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), pattern);
                Predicate codeLike = cb.like(cb.lower(root.get("bkCode")), pattern);
                Predicate phoneLike = cb.like(cb.lower(root.get("phone")), pattern);
                predicates.add(cb.or(nameLike, codeLike, phoneLike));
            }
            query.orderBy(cb.desc(root.get("createdAt")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }
}