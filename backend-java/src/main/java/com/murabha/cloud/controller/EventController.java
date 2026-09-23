package com.murabha.cloud.controller;

import com.murabha.cloud.security.UserPrincipal;
import com.murabha.cloud.service.RealtimeEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final RealtimeEventService realtimeEventService;

    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@AuthenticationPrincipal UserPrincipal principal) {
        return realtimeEventService.subscribe(
                principal.getId(),
                principal.getBranchId(),
                principal.getRole() != null ? principal.getRole().name() : null
        );
    }
}
