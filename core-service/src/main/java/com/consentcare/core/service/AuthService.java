package com.consentcare.core.service;

import com.consentcare.core.dto.AuthDtos.*;
import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import com.consentcare.core.security.JwtUtil;
import com.consentcare.core.security.LoginAttemptService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final NurseRepository nurseRepository;
    private final DepartmentRepository departmentRepository;
    private final DoctorNurseAssignmentRepository assignmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final LoginAttemptService loginAttemptService;
    private final AuditService auditService;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.username())) {
            throw new IllegalArgumentException("Username '" + req.username() + "' is already taken.");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email '" + req.email() + "' is already registered.");
        }

        User user = User.builder()
                .username(req.username().trim())
                .email(req.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.password()))
                .fullName(req.fullName().trim())
                .role(Role.PATIENT)
                .active(true)
                .createdAt(OffsetDateTime.now())
                .build();
        user = userRepository.save(user);

        LocalDate dob = null;
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBlank()) {
            try {
                dob = LocalDate.parse(req.dateOfBirth());
            } catch (Exception ignored) {}
        }

        Patient patient = Patient.builder()
                .linkedUserId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(req.phone())
                .address(req.address())
                .dateOfBirth(dob)
                .gender(req.gender())
                .emergencyContact(req.emergencyContact())
                .bloodGroup(req.bloodGroup())
                .allergies(req.allergies())
                .chronicConditions(req.chronicConditions())
                .medicalHistorySummary("Registered via ConsentCare patient portal.")
                .createdAt(OffsetDateTime.now())
                .build();
        patient = patientRepository.save(patient);

        auditService.logAction(user.getUsername(), Role.PATIENT.name(), "REGISTER", "Patient", patient.getId().toString(), "SUCCESS", "Patient self-registration");

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        return new AuthResponse(token, user.getUsername(), user.getRole(), user.getFullName(), user.getId(), patient.getId());
    }

    public AuthResponse login(LoginRequest req) {
        String username = req.username().trim();
        if (loginAttemptService.isLocked(username)) {
            throw new BadCredentialsException("Account temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.");
        }

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, req.password()));
        } catch (Exception e) {
            loginAttemptService.recordFailure(username);
            throw new BadCredentialsException("Invalid username or password.");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid username or password."));

        if (!user.isActive()) {
            throw new IllegalArgumentException("This account has been deactivated. Please contact your system administrator.");
        }

        loginAttemptService.recordSuccess(username);

        Long profileId = null;
        if (user.getRole() == Role.PATIENT) {
            profileId = patientRepository.findByLinkedUserId(user.getId()).map(Patient::getId).orElse(null);
        } else if (user.getRole() == Role.DOCTOR) {
            profileId = doctorRepository.findByUserId(user.getId()).map(Doctor::getId).orElse(null);
        } else if (user.getRole() == Role.NURSE) {
            profileId = nurseRepository.findByUserId(user.getId()).map(Nurse::getId).orElse(null);
        }

        auditService.logAction(user.getUsername(), user.getRole().name(), "LOGIN", "User", user.getId().toString(), "SUCCESS", "User login authenticated");

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        return new AuthResponse(token, user.getUsername(), user.getRole(), user.getFullName(), user.getId(), profileId);
    }

    @Transactional
    public DoctorSummary createDoctor(CreateDoctorRequest req, User admin) {
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only system administrators can onboard doctors.");
        }
        if (userRepository.existsByUsername(req.username())) {
            throw new IllegalArgumentException("Username '" + req.username() + "' is already taken.");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email '" + req.email() + "' is already registered.");
        }
        if (doctorRepository.findByLicenseNumber(req.licenseNumber()).isPresent()) {
            throw new IllegalArgumentException("Medical license number '" + req.licenseNumber() + "' is already registered.");
        }

        Department department = null;
        if (req.departmentId() != null) {
            department = departmentRepository.findById(req.departmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Department not found with ID: " + req.departmentId()));
        }

        User doctorUser = User.builder()
                .username(req.username().trim())
                .email(req.email().trim().toLowerCase())
                .fullName(req.fullName().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(Role.DOCTOR)
                .active(true)
                .createdAt(OffsetDateTime.now())
                .build();
        doctorUser = userRepository.save(doctorUser);

        Doctor doctor = Doctor.builder()
                .user(doctorUser)
                .specialization(req.specialization().trim())
                .contactNumber(req.contactNumber())
                .department(department)
                .licenseNumber(req.licenseNumber().trim())
                .build();
        doctor = doctorRepository.save(doctor);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "CREATE_DOCTOR", "Doctor", doctor.getId().toString(), "SUCCESS", "Doctor account provisioned");

        return new DoctorSummary(
                doctor.getId(),
                doctorUser.getId(),
                doctorUser.getFullName(),
                doctorUser.getEmail(),
                doctor.getSpecialization(),
                doctor.getContactNumber(),
                department != null ? department.getName() : "General",
                doctor.getLicenseNumber()
        );
    }

    @Transactional
    public NurseSummary createNurse(CreateNurseRequest req, User admin) {
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only system administrators can onboard nurses.");
        }
        if (userRepository.existsByUsername(req.username())) {
            throw new IllegalArgumentException("Username '" + req.username() + "' is already taken.");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email '" + req.email() + "' is already registered.");
        }

        Department department = null;
        if (req.departmentId() != null) {
            department = departmentRepository.findById(req.departmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Department not found with ID: " + req.departmentId()));
        }

        User nurseUser = User.builder()
                .username(req.username().trim())
                .email(req.email().trim().toLowerCase())
                .fullName(req.fullName().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(Role.NURSE)
                .active(true)
                .createdAt(OffsetDateTime.now())
                .build();
        nurseUser = userRepository.save(nurseUser);

        Nurse nurse = Nurse.builder()
                .user(nurseUser)
                .department(department)
                .availabilityStatus(AvailabilityStatus.AVAILABLE)
                .contactNumber(req.contactNumber())
                .build();
        nurse = nurseRepository.save(nurse);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "CREATE_NURSE", "Nurse", nurse.getId().toString(), "SUCCESS", "Nurse account provisioned");

        return new NurseSummary(
                nurse.getId(),
                nurseUser.getId(),
                nurseUser.getFullName(),
                nurseUser.getEmail(),
                department != null ? department.getName() : "General",
                nurse.getAvailabilityStatus(),
                nurse.getContactNumber()
        );
    }

    @Transactional
    public Patient createWalkInPatient(CreateWalkInPatientRequest req, User staff) {
        LocalDate dob = null;
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBlank()) {
            try {
                dob = LocalDate.parse(req.dateOfBirth());
            } catch (Exception ignored) {}
        }

        Patient patient = Patient.builder()
                .linkedUserId(null)
                .fullName(req.fullName().trim())
                .dateOfBirth(dob)
                .gender(req.gender())
                .phone(req.phone())
                .email(req.email())
                .address(req.address())
                .emergencyContact(req.emergencyContact())
                .bloodGroup(req.bloodGroup())
                .allergies(req.allergies())
                .chronicConditions(req.chronicConditions())
                .medicalHistorySummary(req.medicalHistorySummary() != null ? req.medicalHistorySummary() : "Walk-in patient created by staff")
                .createdAt(OffsetDateTime.now())
                .build();
        patient = patientRepository.save(patient);

        auditService.logAction(staff.getUsername(), staff.getRole().name(), "CREATE_WALKIN_PATIENT", "Patient", patient.getId().toString(), "SUCCESS", "Staff created walk-in patient");
        return patient;
    }

    @Transactional
    public void updateUserStatus(Long userId, boolean active, User admin) {
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only system administrators can alter account active status.");
        }
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        target.setActive(active);
        userRepository.save(target);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), active ? "ACTIVATE_USER" : "DEACTIVATE_USER", "User", userId.toString(), "SUCCESS", "Account active status updated");
    }

    @Transactional
    public void assignNurseToDoctor(Long doctorId, Long nurseId, User admin) {
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only system administrators can assign nurses to doctors.");
        }
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found: " + doctorId));
        Nurse nurse = nurseRepository.findById(nurseId)
                .orElseThrow(() -> new IllegalArgumentException("Nurse not found: " + nurseId));

        DoctorNurseAssignment assignment = assignmentRepository.findByDoctorIdAndNurseId(doctorId, nurseId)
                .orElseGet(() -> DoctorNurseAssignment.builder().doctor(doctor).nurse(nurse).build());
        assignment.setActive(true);
        assignment.setAssignedAt(OffsetDateTime.now());
        assignmentRepository.save(assignment);

        auditService.logAction(admin.getUsername(), Role.ADMIN.name(), "ASSIGN_NURSE_DOCTOR", "DoctorNurseAssignment", doctorId + "-" + nurseId, "SUCCESS", "Assigned nurse to doctor team");
    }

    public List<UserSummary> listUsers(User admin) {
        if (admin.getRole() != Role.ADMIN) {
            throw new IllegalArgumentException("Only administrators can view system user list.");
        }
        return userRepository.findAll().stream()
                .map(u -> new UserSummary(u.getId(), u.getUsername(), u.getEmail(), u.getFullName(), u.getRole(), u.isActive(), u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""))
                .toList();
    }

    public List<DoctorSummary> listDoctors() {
        return doctorRepository.findAll().stream()
                .map(d -> new DoctorSummary(
                        d.getId(),
                        d.getUser().getId(),
                        d.getUser().getFullName(),
                        d.getUser().getEmail(),
                        d.getSpecialization(),
                        d.getContactNumber(),
                        d.getDepartment() != null ? d.getDepartment().getName() : "General",
                        d.getLicenseNumber()
                ))
                .toList();
    }

    public List<NurseSummary> listNurses() {
        return nurseRepository.findAll().stream()
                .map(n -> new NurseSummary(
                        n.getId(),
                        n.getUser().getId(),
                        n.getUser().getFullName(),
                        n.getUser().getEmail(),
                        n.getDepartment() != null ? n.getDepartment().getName() : "General",
                        n.getAvailabilityStatus(),
                        n.getContactNumber()
                ))
                .toList();
    }

    public List<DepartmentSummary> listDepartments() {
        return departmentRepository.findAll().stream()
                .map(d -> new DepartmentSummary(d.getId(), d.getName(), d.getDescription()))
                .toList();
    }
}
