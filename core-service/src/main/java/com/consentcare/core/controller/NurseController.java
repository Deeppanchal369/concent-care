package com.consentcare.core.controller;

import com.consentcare.core.dto.AuthDtos.NurseSummary;
import com.consentcare.core.dto.CareDtos.*;
import com.consentcare.core.model.AvailabilityStatus;
import com.consentcare.core.model.User;
import com.consentcare.core.service.NurseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/nurses")
@RequiredArgsConstructor
public class NurseController {

    private final NurseService nurseService;

    @GetMapping
    public ResponseEntity<List<NurseSummary>> listNurses() {
        return ResponseEntity.ok(nurseService.listAllNurses());
    }

    @GetMapping({"/me", "/my/status"})
    @PreAuthorize("hasRole('NURSE')")
    public ResponseEntity<NurseSummary> getMyProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(nurseService.getNurseByUserId(user.getId()));
    }

    @GetMapping("/my/tasks")
    @PreAuthorize("hasRole('NURSE')")
    public ResponseEntity<List<NurseTaskResponse>> getMyTasks(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(nurseService.getMyTasks(user.getId()));
    }

    @GetMapping("/tasks/doctor/my")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<List<NurseTaskResponse>> getMyDoctorTasks(@AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(nurseService.getTasksForDoctor(doctorUser.getId()));
    }

    @PostMapping("/tasks")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<NurseTaskResponse> assignTask(
            @Valid @RequestBody CreateNurseTaskRequest req,
            @AuthenticationPrincipal User doctorUser) {
        return ResponseEntity.ok(nurseService.assignTask(req, doctorUser));
    }

    @PatchMapping("/tasks/{id}/status")
    @PreAuthorize("hasRole('NURSE')")
    public ResponseEntity<NurseTaskResponse> updateTaskStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateNurseTaskStatusRequest req,
            @AuthenticationPrincipal User nurseUser) {
        return ResponseEntity.ok(nurseService.updateTaskStatus(id, req, nurseUser));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('NURSE', 'ADMIN')")
    public ResponseEntity<Void> setNurseAvailability(
            @PathVariable Long id,
            @RequestParam("status") AvailabilityStatus status,
            @AuthenticationPrincipal User actor) {
        nurseService.setNurseAvailability(id, status, actor);
        return ResponseEntity.noContent().build();
    }
}

