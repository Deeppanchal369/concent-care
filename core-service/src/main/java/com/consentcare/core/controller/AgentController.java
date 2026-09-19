package com.consentcare.core.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

/**
 * Proxies requests to agent-service (the agentic AI compliance
 * assistant), so the frontend has one backend (core-service) to talk to
 * regardless of which downstream microservice actually handles a request.
 */
@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
public class AgentController {

    private final WebClient agentServiceClient;

    /**
     * Diagnostic health check for agent-service connectivity, restricted to system administrators.
     */
    @GetMapping("/health")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Object> health() {
        try {
            Object result = agentServiceClient.get().uri("/health").retrieve().bodyToMono(Object.class).block();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "agent-service unreachable", "details", e.getMessage()));
        }
    }
}
