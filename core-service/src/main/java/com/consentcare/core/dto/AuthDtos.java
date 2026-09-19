package com.consentcare.core.dto;

import com.consentcare.core.model.AvailabilityStatus;
import com.consentcare.core.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    private static final String PASSWORD_PATTERN = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$";
    private static final String PASSWORD_MESSAGE = "Password must be at least 8 characters and include both a letter and a number.";

    public record LoginRequest(
            @NotBlank(message = "Username is required.") String username,
            @NotBlank(message = "Password is required.") String password
    ) {}

    public record RegisterRequest(
            @NotBlank(message = "Username is required.")
            @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters.")
            String username,

            @NotBlank(message = "Email is required.")
            @Email(message = "Enter a valid email address.")
            String email,

            @NotBlank(message = "Password is required.")
            @Pattern(regexp = PASSWORD_PATTERN, message = PASSWORD_MESSAGE)
            String password,

            @NotBlank(message = "Full name is required.")
            String fullName,

            String phone,
            String address,
            String dateOfBirth,
            String gender,
            String emergencyContact,
            String bloodGroup,
            String allergies,
            String chronicConditions
    ) {}

    public record AuthResponse(
            String token,
            String username,
            Role role,
            String fullName,
            Long userId,
            Long profileId // patientId if PATIENT, doctorId if DOCTOR, nurseId if NURSE
    ) {}

    /**
     * Generic staff-creation request sent by the Admin UI.
     * The role field determines whether a Doctor, Nurse, or Admin account is provisioned.
     */
    public record CreateStaffRequest(
            @NotBlank(message = "Username is required.")
            @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters.")
            String username,

            @NotBlank(message = "Email is required.")
            @Email(message = "Enter a valid email address.")
            String email,

            @NotBlank(message = "Password is required.")
            @Pattern(regexp = PASSWORD_PATTERN, message = PASSWORD_MESSAGE)
            String password,

            @NotBlank(message = "Full name is required.")
            String fullName,

            @NotBlank(message = "Role is required.")
            String role,

            String specialization,
            String licenseNumber,
            Long departmentId
    ) {}

    public record CreateDoctorRequest(
            @NotBlank String username,
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = PASSWORD_PATTERN, message = PASSWORD_MESSAGE) String password,
            @NotBlank String fullName,
            @NotBlank String specialization,
            String contactNumber,
            Long departmentId,
            @NotBlank String licenseNumber
    ) {}

    public record CreateNurseRequest(
            @NotBlank String username,
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = PASSWORD_PATTERN, message = PASSWORD_MESSAGE) String password,
            @NotBlank String fullName,
            Long departmentId,
            String contactNumber
    ) {}

    public record CreateWalkInPatientRequest(
            @NotBlank String fullName,
            String dateOfBirth,
            String gender,
            String phone,
            String email,
            String address,
            String emergencyContact,
            String bloodGroup,
            String allergies,
            String chronicConditions,
            String medicalHistorySummary
    ) {}

    public record UserSummary(
            Long id,
            String username,
            String email,
            String fullName,
            Role role,
            boolean active,
            String createdAt
    ) {}

    public record DoctorSummary(
            Long id,
            Long userId,
            String fullName,
            String email,
            String specialization,
            String contactNumber,
            String departmentName,
            String licenseNumber
    ) {}

    public record NurseSummary(
            Long id,
            Long userId,
            String fullName,
            String email,
            String departmentName,
            AvailabilityStatus availabilityStatus,
            String contactNumber
    ) {}

    public record DepartmentSummary(
            Long id,
            String name,
            String description
    ) {}

    public record AssignNurseRequest(
            @NotNull Long doctorId,
            @NotNull Long nurseId
    ) {}

    public record UpdateUserStatusRequest(
            boolean active
    ) {}
}
