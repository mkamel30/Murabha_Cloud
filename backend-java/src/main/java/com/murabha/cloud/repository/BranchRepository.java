package com.murabha.cloud.repository;

import com.murabha.cloud.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BranchRepository extends JpaRepository<Branch, UUID> {
    Optional<Branch> findByCode(String code);
    boolean existsByCode(String code);
}