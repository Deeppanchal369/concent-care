package com.consentcare.core.config;

import com.consentcare.core.model.*;
import com.consentcare.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final NurseRepository nurseRepository;
    private final PatientRepository patientRepository;
    private final DoctorNurseAssignmentRepository assignmentRepository;
    private final PatientDoctorRelationshipRepository relationshipRepository;
    private final ConsentRepository consentRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final ObservationRepository observationRepository;
    private final LabRequestRepository labRequestRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${consentcare.admin.email:admin@consentcare.local}")
    private String adminEmail;

    @Value("${consentcare.admin.password:Admin@12345}")
    private String adminPassword;

    @Value("${consentcare.admin.name:ConsentCare System Administrator}")
    private String adminName;

    @Override
    @Transactional
    public void run(String... args) {
        seedAdminIfMissing();
        seedDemoDataIfEmpty();
    }

    private void seedAdminIfMissing() {
        if (!userRepository.existsByEmail(adminEmail) && !userRepository.existsByUsername("admin")) {
            log.info("Bootstrapping development administrator: {}", adminEmail);
            User admin = User.builder()
                    .username("admin")
                    .email(adminEmail)
                    .fullName(adminName)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMIN)
                    .active(true)
                    .createdAt(OffsetDateTime.now())
                    .build();
            userRepository.save(admin);
        }
    }

    private void seedDemoDataIfEmpty() {
        if (doctorRepository.count() > 0) {
            return; // Data already seeded
        }

        log.info("Seeding realistic clinical demo data (synthetic demonstration dataset)...");

        Department cardio = departmentRepository.findByName("Cardiology")
                .orElseGet(() -> departmentRepository.save(Department.builder().name("Cardiology").description("Cardiovascular care").createdAt(OffsetDateTime.now()).build()));
        Department endo = departmentRepository.findByName("Endocrinology")
                .orElseGet(() -> departmentRepository.save(Department.builder().name("Endocrinology").description("Metabolic disorders and diabetes").createdAt(OffsetDateTime.now()).build()));

        // Seed Doctor 1: Dr. Sarah Jenkins
        User doc1User = userRepository.save(User.builder()
                .username("dr.jenkins")
                .email("s.jenkins@consentcare.local")
                .fullName("Dr. Sarah Jenkins, MD")
                .passwordHash(passwordEncoder.encode("Doctor@123"))
                .role(Role.DOCTOR)
                .active(true)
                .createdAt(OffsetDateTime.now())
                .build());

        Doctor doc1 = doctorRepository.save(Doctor.builder()
                .user(doc1User)
                .specialization("Interventional Cardiology")
                .contactNumber("+1-555-0101")
                .department(cardio)
                .licenseNumber("MED-CARD-7821")
                .build());

        // Seed Doctor 2: Dr. Marcus Vance
        User doc2User = userRepository.save(User.builder()
                .username("dr.vance")
                .email("m.vance@consentcare.local")
                .fullName("Dr. Marcus Vance, MD")
                .passwordHash(passwordEncoder.encode("Doctor@123"))
                .role(Role.DOCTOR)
                .active(true)
                .createdAt(OffsetDateTime.now())
                .build());

        Doctor doc2 = doctorRepository.save(Doctor.builder()
                .user(doc2User)
                .specialization("Endocrinology & Diabetes Care")
                .contactNumber("+1-555-0102")
                .department(endo)
                .licenseNumber("MED-ENDO-9943")
                .build());

        // Seed Nurses 1 to 4 for Doctor Jenkins
        String[] nurseCardioNames = {"Nurse Elena Rostova", "Nurse David Miller", "Nurse Priya Sharma", "Nurse Lucas Grey"};
        String[] nurseCardioUsernames = {"nurse.elena", "nurse.david", "nurse.priya", "nurse.lucas"};

        for (int i = 0; i < nurseCardioNames.length; i++) {
            User nurseUser = userRepository.save(User.builder()
                    .username(nurseCardioUsernames[i])
                    .email(nurseCardioUsernames[i] + "@consentcare.local")
                    .fullName(nurseCardioNames[i])
                    .passwordHash(passwordEncoder.encode("Nurse@123"))
                    .role(Role.NURSE)
                    .active(true)
                    .createdAt(OffsetDateTime.now())
                    .build());

            Nurse nurse = nurseRepository.save(Nurse.builder()
                    .user(nurseUser)
                    .department(cardio)
                    .availabilityStatus(AvailabilityStatus.AVAILABLE)
                    .contactNumber("+1-555-020" + (i + 1))
                    .build());

            assignmentRepository.save(DoctorNurseAssignment.builder()
                    .doctor(doc1)
                    .nurse(nurse)
                    .assignedAt(OffsetDateTime.now())
                    .active(true)
                    .build());
        }

        // Seed Nurses 5 and 6 for Doctor Vance
        String[] nurseEndoNames = {"Nurse Fatima Al-Sayed", "Nurse James O'Connor"};
        String[] nurseEndoUsernames = {"nurse.fatima", "nurse.james"};

        for (int i = 0; i < nurseEndoNames.length; i++) {
            User nurseUser = userRepository.save(User.builder()
                    .username(nurseEndoUsernames[i])
                    .email(nurseEndoUsernames[i] + "@consentcare.local")
                    .fullName(nurseEndoNames[i])
                    .passwordHash(passwordEncoder.encode("Nurse@123"))
                    .role(Role.NURSE)
                    .active(true)
                    .createdAt(OffsetDateTime.now())
                    .build());

            Nurse nurse = nurseRepository.save(Nurse.builder()
                    .user(nurseUser)
                    .department(endo)
                    .availabilityStatus(AvailabilityStatus.AVAILABLE)
                    .contactNumber("+1-555-030" + (i + 1))
                    .build());

            assignmentRepository.save(DoctorNurseAssignment.builder()
                    .doctor(doc2)
                    .nurse(nurse)
                    .assignedAt(OffsetDateTime.now())
                    .active(true)
                    .build());
        }

        // Seed 10 Realistic Patients
        String[] patientNames = {
                "Eleanor Vance", "Arthur Pendelton", "Maya Lin", "Robert Kowalski",
                "Sophia Chen", "Carlos Mendez", "Hannah Abbott", "Tariq Mansoor",
                "Gemma Ward", "Dmitri Volkov"
        };
        String[] dobs = {
                "1958-04-12", "1964-11-23", "1982-08-15", "1971-02-09",
                "1990-07-30", "1953-09-18", "1988-12-05", "1967-03-22",
                "1976-10-14", "1949-06-01"
        };
        String[] chronicConditions = {
                "Type 2 Diabetes, Hypertension", "Coronary Artery Disease, Hyperlipidemia",
                "Asthma, Seasonal Rhinitis", "Hypertension, Chronic Kidney Disease Stage 2",
                "None", "Type 2 Diabetes, Diabetic Neuropathy, Congestive Heart Failure",
                "Mild Migraine", "Type 2 Diabetes, Hypertension", "Rheumatoid Arthritis",
                "Atrial Fibrillation, Hypertension"
        };

        for (int i = 0; i < patientNames.length; i++) {
            String uname = "patient." + patientNames[i].toLowerCase().replace(" ", ".");
            User pUser = userRepository.save(User.builder()
                    .username(uname)
                    .email(uname + "@consentcare.local")
                    .fullName(patientNames[i])
                    .passwordHash(passwordEncoder.encode("Patient@123"))
                    .role(Role.PATIENT)
                    .active(true)
                    .createdAt(OffsetDateTime.now())
                    .build());

            Patient patient = patientRepository.save(Patient.builder()
                    .linkedUserId(pUser.getId())
                    .fullName(patientNames[i])
                    .dateOfBirth(LocalDate.parse(dobs[i]))
                    .gender(i % 2 == 0 ? "Female" : "Male")
                    .phone("+1-555-09" + String.format("%02d", i + 1))
                    .email(uname + "@consentcare.local")
                    .address("10" + (i + 1) + " Healthcare Boulevard, Metropolis")
                    .emergencyContact("Primary Kin: +1-555-99" + String.format("%02d", i + 1))
                    .bloodGroup(i % 4 == 0 ? "O+" : (i % 4 == 1 ? "A+" : (i % 4 == 2 ? "B+" : "AB+")))
                    .allergies(i % 3 == 0 ? "Penicillin, Sulfa drugs" : (i % 3 == 1 ? "Latex" : "None known"))
                    .chronicConditions(chronicConditions[i])
                    .medicalHistorySummary("Demonstration patient synthetic record initialized for ConsentCare clinical workflows.")
                    .createdAt(OffsetDateTime.now().minusMonths(6 - (i % 5)))
                    .build());

            // Assign relationship and active consent for the first 3 patients to Dr. Jenkins, and patients 3-6 to Dr. Vance
            if (i < 3) {
                relationshipRepository.save(PatientDoctorRelationship.builder()
                        .patient(patient)
                        .doctor(doc1)
                        .status("ACTIVE")
                        .createdAt(OffsetDateTime.now().minusMonths(3))
                        .build());

                consentRepository.save(Consent.builder()
                        .patientId(patient.getId())
                        .doctorId(doc1.getId())
                        .category(ConsentCategory.ENTIRE_RECORD)
                        .purpose("Comprehensive Cardiology Care")
                        .grantedAt(OffsetDateTime.now().minusMonths(2))
                        .expiresAt(OffsetDateTime.now().plusMonths(6))
                        .status(ConsentStatus.ACTIVE)
                        .build());

                // Seed vitals
                observationRepository.save(Observation.builder()
                        .patientId(patient.getId())
                        .doctorId(doc1.getId())
                        .vitalType("BLOOD_PRESSURE")
                        .valueNumeric(new BigDecimal("128.00"))
                        .valueText("128/82 mmHg")
                        .unit("mmHg")
                        .notes("Sitting position, right arm")
                        .observedAt(OffsetDateTime.now().minusDays(10))
                        .build());

                observationRepository.save(Observation.builder()
                        .patientId(patient.getId())
                        .doctorId(doc1.getId())
                        .vitalType("HEART_RATE")
                        .valueNumeric(new BigDecimal("72.00"))
                        .valueText("72 bpm")
                        .unit("bpm")
                        .observedAt(OffsetDateTime.now().minusDays(10))
                        .build());

                // Seed prescription
                Prescription rx = prescriptionRepository.save(Prescription.builder()
                        .patientId(patient.getId())
                        .doctorId(doc1.getId())
                        .status("ACTIVE")
                        .notes("Follow-up in 30 days for blood pressure review")
                        .createdAt(OffsetDateTime.now().minusDays(10))
                        .build());

                prescriptionItemRepository.save(PrescriptionItem.builder()
                        .prescriptionId(rx.getId())
                        .medicationName("Lisinopril")
                        .dosage("10 mg")
                        .frequency("Once daily morning")
                        .durationDays(30)
                        .instructions("Take with or without food")
                        .startDate(LocalDate.now().minusDays(10))
                        .endDate(LocalDate.now().plusDays(20))
                        .active(true)
                        .build());
            } else if (i >= 3 && i < 6) {
                relationshipRepository.save(PatientDoctorRelationship.builder()
                        .patient(patient)
                        .doctor(doc2)
                        .status("ACTIVE")
                        .createdAt(OffsetDateTime.now().minusMonths(2))
                        .build());

                consentRepository.save(Consent.builder()
                        .patientId(patient.getId())
                        .doctorId(doc2.getId())
                        .category(ConsentCategory.LAB_REPORTS)
                        .purpose("Endocrine blood glucose & HbA1c monitoring")
                        .grantedAt(OffsetDateTime.now().minusMonths(1))
                        .expiresAt(OffsetDateTime.now().plusMonths(3))
                        .status(ConsentStatus.ACTIVE)
                        .build());

                consentRepository.save(Consent.builder()
                        .patientId(patient.getId())
                        .doctorId(doc2.getId())
                        .category(ConsentCategory.PRESCRIPTIONS)
                        .purpose("Diabetes medication adjustments")
                        .grantedAt(OffsetDateTime.now().minusMonths(1))
                        .expiresAt(OffsetDateTime.now().plusMonths(3))
                        .status(ConsentStatus.ACTIVE)
                        .build());

                // Seed lab request
                labRequestRepository.save(LabRequest.builder()
                        .patientId(patient.getId())
                        .doctorId(doc2.getId())
                        .testName("Glycated Hemoglobin (HbA1c)")
                        .category("Diabetes Monitoring")
                        .urgency("ROUTINE")
                        .status("ORDERED")
                        .instructions("Fasting preferred, blood draw via venipuncture")
                        .createdAt(OffsetDateTime.now().minusDays(3))
                        .build());
            }
        }
        log.info("Demo data seeding completed successfully: 2 Doctors, 6 Nurses, 10 Patients.");
    }
}

