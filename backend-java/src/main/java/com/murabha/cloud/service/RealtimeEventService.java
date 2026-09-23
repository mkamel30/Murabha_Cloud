package com.murabha.cloud.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class RealtimeEventService {

    // 1 hour timeout for each SSE connection
    private static final long SSE_TIMEOUT = 60 * 60 * 1000L;

    private static class ClientConnection {
        final String connectionId;
        final UUID userId;
        final UUID branchId;
        final String role;
        final SseEmitter emitter;

        ClientConnection(String connectionId, UUID userId, UUID branchId, String role, SseEmitter emitter) {
            this.connectionId = connectionId;
            this.userId = userId;
            this.branchId = branchId;
            this.role = role;
            this.emitter = emitter;
        }
    }

    private final List<ClientConnection> connections = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(UUID userId, UUID branchId, String role) {
        String connectionId = UUID.randomUUID().toString();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        ClientConnection client = new ClientConnection(connectionId, userId, branchId, role, emitter);
        connections.add(client);

        emitter.onCompletion(() -> {
            log.debug("SSE client completed: {}", connectionId);
            connections.remove(client);
        });

        emitter.onTimeout(() -> {
            log.debug("SSE client timed out: {}", connectionId);
            emitter.complete();
            connections.remove(client);
        });

        emitter.onError(e -> {
            log.debug("SSE client error: {}, message: {}", connectionId, e.getMessage());
            connections.remove(client);
        });

        // Send initial connection confirmation
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of(
                            "status", "CONNECTED",
                            "connectionId", connectionId,
                            "timestamp", System.currentTimeMillis()
                    )));
        } catch (IOException e) {
            log.warn("Failed to send initial SSE connection event: {}", e.getMessage());
            connections.remove(client);
        }

        return emitter;
    }

    public void broadcast(String entityType, String action, UUID entityId, UUID branchId) {
        if (connections.isEmpty()) {
            return;
        }

        Map<String, Object> payload = Map.of(
                "entityType", entityType,
                "action", action,
                "entityId", entityId != null ? entityId.toString() : "",
                "branchId", branchId != null ? branchId.toString() : "",
                "timestamp", System.currentTimeMillis()
        );

        log.info("Broadcasting realtime event: {} {} for entity {} to {} active clients",
                entityType, action, entityId, connections.size());

        List<ClientConnection> deadConnections = new CopyOnWriteArrayList<>();

        for (ClientConnection client : connections) {
            try {
                client.emitter.send(SseEmitter.event()
                        .name("CHANGE")
                        .data(payload));
            } catch (Exception e) {
                log.debug("Failed to deliver SSE event to client {}: {}", client.connectionId, e.getMessage());
                deadConnections.add(client);
            }
        }

        if (!deadConnections.isEmpty()) {
            connections.removeAll(deadConnections);
        }
    }

    /**
     * Heartbeat every 25 seconds to keep HTTP connections alive across proxies, firewalls, and routers.
     */
    @Scheduled(fixedRate = 25000)
    public void sendHeartbeat() {
        if (connections.isEmpty()) {
            return;
        }

        List<ClientConnection> deadConnections = new CopyOnWriteArrayList<>();

        for (ClientConnection client : connections) {
            try {
                client.emitter.send(SseEmitter.event()
                        .name("PING")
                        .data(Map.of("ping", System.currentTimeMillis())));
            } catch (Exception e) {
                deadConnections.add(client);
            }
        }

        if (!deadConnections.isEmpty()) {
            connections.removeAll(deadConnections);
        }
    }
}
