package com.murabha.cloud.repository;

import com.murabha.cloud.entity.InstallmentRequest;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstallmentRequestRepository extends JpaRepository<InstallmentRequest, UUID>, JpaSpecificationExecutor<InstallmentRequest> {

    Optional<InstallmentRequest> findByRequestNumber(String requestNumber);
    
    List<InstallmentRequest> findByMachineSerialIgnoreCaseAndStatusIn(String machineSerial, List<String> statuses);

    long countByBranchIdAndStatus(UUID branchId, String status);

    default List<InstallmentRequest> findWithFilters(UUID branchId, String status) {
        Specification<InstallmentRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            if (status != null && !status.isBlank()) predicates.add(cb.equal(root.get("status"), status));
            query.orderBy(cb.desc(root.get("createdAt")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return findAll(spec);
    }

    default long countPendingByBranch(UUID branchId) {
        Specification<InstallmentRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (branchId != null) predicates.add(cb.equal(root.get("branchId"), branchId));
            predicates.add(root.get("status").in("PENDING_SUPERVISOR", "PENDING_MANAGER"));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return count(spec);
    }
}