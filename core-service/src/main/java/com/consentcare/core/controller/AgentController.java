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

    @PostMapping("/risk-aware-alert")
    public ResponseEntity<Object> riskAwareAlert(@RequestParam("patientId") String patientId,
                                                  @RequestBody Map<String, Object> features) {
        try {
            Object result = agentServiceClient.post()
                    .uri(uriBuilder -> uriBuilder.path("/agent/risk-aware-alert").queryParam("patient_id", patientId).build())
                    .bodyValue(features)
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();
            return ResponseEntity.ok(result);
        } catch (WebClientResponseException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .body(Map.of("error", "agent-service returned an error", "details", e.getResponseBodyAsString()));
        } catch (Exception e) {
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Could not reach agent-service", "details", e.getMessage()));
        }
    }

    @PostMapping("/summarize")
    public ResponseEntity<Object> summarize(@RequestBody Map<String, Object> body) {
        try {
            Object result = agentServiceClient.post()
                    .uri("/agent/summarize")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Could not reach agent-service", "details", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Object> health() {
        try {
            Object result = agentServiceClient.get().uri("/health").retrieve().bodyToMono(Object.class).block();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "agent-service unreachable", "details", e.getMessage()));
        }
    }
}
