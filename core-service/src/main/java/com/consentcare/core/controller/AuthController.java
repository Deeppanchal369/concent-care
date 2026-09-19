package com.consentcare.core.controller;

import com.consentcare.core.dto.AuthDtos.*;
import com.consentcare.core.model.User;
import com.consentcare.core.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<UserSummary> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new UserSummary(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt() != null ? user.getCreatedAt().toString() : ""
        ));
    }

    /** Admin-only: lists all accounts, for the staff-management screen. */
    @GetMapping("/users")
    public ResponseEntity<List<UserSummary>> listUsers(@AuthenticationPrincipal User actingAdmin) {
        return ResponseEntity.ok(authService.listUsers(actingAdmin));
    }
}
