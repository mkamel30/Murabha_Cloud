package com.murabha.cloud.repository;

import com.murabha.cloud.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("SELECT n FROM Notification n WHERE (n.userId = :userId OR (n.branchId = :branchId AND n.targetRole = :role)) " +
           "ORDER BY n.createdAt DESC")
    List<Notification> findForUser(@Param("userId") UUID userId, @Param("branchId") UUID branchId, @Param("role") String role);

    @Query("SELECT COUNT(n) FROM Notification n WHERE (n.userId = :userId OR (n.branchId = :branchId AND n.targetRole = :role)) " +
           "AND n.isRead = false")
    long countUnreadForUser(@Param("userId") UUID userId, @Param("branchId") UUID branchId, @Param("role") String role);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE (n.userId = :userId OR (n.branchId = :branchId AND n.targetRole = :role))")
    void markAllAsReadForUser(@Param("userId") UUID userId, @Param("branchId") UUID branchId, @Param("role") String role);
}