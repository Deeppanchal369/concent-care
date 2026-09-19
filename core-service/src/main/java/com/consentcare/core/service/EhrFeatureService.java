package com.consentcare.core.service;

import com.consentcare.core.model.Patient;
import com.consentcare.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EhrFeatureService {

    private final PatientRepository patientRepository;
    private final EncounterRepository encounterRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final DiagnosisRepository diagnosisRepository;
    private final LabReportRepository labReportRepository;

    public Map<String, Object> extractFeatures(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + patientId));

        List<String> missingFeatures = new ArrayList<>();

        // 1. Age (Mandatory: Must have real Date of Birth)
        Integer age = null;
        if (patient.getDateOfBirth() != null) {
            age = Period.between(patient.getDateOfBirth(), LocalDate.now()).getYears();
        } else {
            missingFeatures.add("age (Date of Birth missing)");
        }

        // 2. Encounters / Visits History
        var encounters = encounterRepository.findByPatientIdOrderByEncounterDateDesc(patientId);
        boolean hasEncounters = !encounters.isEmpty();
        if (!hasEncounters) {
            missingFeatures.add("clinical encounters history (0 recorded visits)");
        }

        int numberInpatient = 0;
        int numberOutpatient = 0;
        int numberEmergency = 0;
        int timeInHospital = 1;

        for (var enc : encounters) {
            String encType = enc.getEncounterType() != null ? enc.getEncounterType().toUpperCase() : "OUTPATIENT";
            if ("INPATIENT".equals(encType)) {
                numberInpatient++;
                timeInHospital = Math.max(timeInHospital, 3);
            } else if ("EMERGENCY".equals(encType)) {
                numberEmergency++;
            } else {
                numberOutpatient++;
            }
        }

        // 3. Laboratory procedures count
        var labReports = labReportRepository.findByPatientIdOrderByReportedAtDesc(patientId);
        int numLabProcedures = labReports.size();
        boolean a1cTested = labReports.stream()
                .anyMatch(r -> r.getTestName() != null && r.getTestName().toLowerCase().contains("a1c"));

        // 4. Prescriptions & Medication Analysis
        var prescriptions = prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        int activePrescriptionCount = 0;
        boolean diabetesMed = false;
        boolean insulin = false;

        for (var p : prescriptions) {
            var items = prescriptionItemRepository.findByPrescriptionId(p.getId());
            for (var item : items) {
                if (item.isActive()) {
                    activePrescriptionCount++;
                    String medName = (item.getMedicationName() != null) ? item.getMedicationName().toLowerCase() : "";
                    if (medName.contains("insulin")) {
                        insulin = true;
                        diabetesMed = true;
                    } else if (medName.contains("metformin") || medName.contains("glipizide") || medName.contains("glimepiride")) {
                        diabetesMed = true;
                    }
                }
            }
        }

        // 5. Diagnoses count & chronic status
        var diagnoses = diagnosisRepository.findByPatientIdOrderByDiagnosedDateDesc(patientId);
        int numberDiagnoses = diagnoses.size();

        // 6. Data Completeness & Insufficient Data determination
        boolean hasSufficientData = missingFeatures.isEmpty();
        String completeness = hasSufficientData ? "COMPLETE (100%)" : "INCOMPLETE (" + Math.max(10, 100 - (missingFeatures.size() * 40)) + "%)";

        Map<String, Object> features = new LinkedHashMap<>();
        features.put("patient_id", String.valueOf(patientId));
        features.put("has_sufficient_data", hasSufficientData);
        features.put("missing_features", missingFeatures);
        features.put("data_completeness", completeness);
        features.put("has_encounters", hasEncounters);

        if (age != null) {
            features.put("age", age);
        }
        features.put("time_in_hospital", timeInHospital);
        features.put("num_lab_procedures", numLabProcedures);
        features.put("num_procedures", encounters.size());
        features.put("num_medications", activePrescriptionCount);
        features.put("number_outpatient", numberOutpatient);
        features.put("number_emergency", numberEmergency);
        features.put("number_inpatient", numberInpatient);
        features.put("number_diagnoses", Math.max(1, numberDiagnoses));
        features.put("diabetes_med", diabetesMed ? 1 : 0);
        features.put("insulin", insulin ? 1 : 0);
        features.put("a1c_tested", a1cTested ? 1 : 0);

        return features;
    }
}
