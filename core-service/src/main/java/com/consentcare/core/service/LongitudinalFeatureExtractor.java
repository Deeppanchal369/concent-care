package com.consentcare.core.service;

import com.consentcare.core.model.Observation;
import com.consentcare.core.model.Patient;
import com.consentcare.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LongitudinalFeatureExtractor {

    private final PatientRepository patientRepository;
    private final EncounterRepository encounterRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final DiagnosisRepository diagnosisRepository;
    private final LabReportRepository labReportRepository;
    private final ObservationRepository observationRepository;
    private final EhrFeatureService ehrFeatureService;

    public Map<String, Object> extractLongitudinalData(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found: " + patientId));

        Map<String, Object> baseFeatures = ehrFeatureService.extractFeatures(patientId);

        // 1. Demographics
        Integer age = null;
        if (patient.getDateOfBirth() != null) {
            age = Period.between(patient.getDateOfBirth(), LocalDate.now()).getYears();
        }
        String gender = patient.getGender() != null ? patient.getGender() : "UNKNOWN";

        // 2. Encounters Timeline
        var encounters = encounterRepository.findByPatientIdOrderByEncounterDateDesc(patientId);
        List<Map<String, Object>> encountersTimeline = new ArrayList<>();
        for (var enc : encounters) {
            Map<String, Object> eMap = new LinkedHashMap<>();
            eMap.put("id", enc.getId());
            eMap.put("type", enc.getEncounterType());
            eMap.put("reason", enc.getChiefComplaint() != null ? enc.getChiefComplaint() : "Clinical encounter");
            eMap.put("date", enc.getEncounterDate() != null ? enc.getEncounterDate().toString() : "");
            eMap.put("assessment_plan", enc.getAssessmentPlan());
            encountersTimeline.add(eMap);
        }

        // 3. Active Diagnoses
        var diagnoses = diagnosisRepository.findByPatientIdOrderByDiagnosedDateDesc(patientId);
        List<String> diagnosisNames = diagnoses.stream()
                .map(d -> d.getDescription() != null ? d.getDescription() : d.getCode())
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // 4. Active Medications
        var prescriptions = prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        List<String> activeMeds = new ArrayList<>();
        for (var p : prescriptions) {
            var items = prescriptionItemRepository.findByPrescriptionId(p.getId());
            for (var item : items) {
                if (item.isActive() && item.getMedicationName() != null) {
                    activeMeds.add(item.getMedicationName() + (item.getDosage() != null ? " " + item.getDosage() : ""));
                }
            }
        }

        // 5. Vitals Timeline (from observations)
        var observations = observationRepository.findByPatientIdOrderByObservedAtDesc(patientId);
        // Group by observation timestamp/session
        Map<String, Map<String, Object>> vitalsByDate = new TreeMap<>();
        for (Observation obs : observations) {
            String dateKey = obs.getObservedAt() != null ? obs.getObservedAt().toString() : "UNKNOWN";
            vitalsByDate.computeIfAbsent(dateKey, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("timestamp", k);
                return m;
            });
            String vType = obs.getVitalType() != null ? obs.getVitalType().toUpperCase() : "";
            BigDecimal val = obs.getValueNumeric();
            if (val != null) {
                if (vType.contains("SYSTOLIC")) {
                    vitalsByDate.get(dateKey).put("systolic", val.doubleValue());
                } else if (vType.contains("DIASTOLIC")) {
                    vitalsByDate.get(dateKey).put("diastolic", val.doubleValue());
                } else if (vType.contains("HEART") || vType.contains("PULSE")) {
                    vitalsByDate.get(dateKey).put("heart_rate", val.doubleValue());
                } else if (vType.contains("TEMP")) {
                    vitalsByDate.get(dateKey).put("temperature", val.doubleValue());
                } else if (vType.contains("RESP")) {
                    vitalsByDate.get(dateKey).put("respiratory_rate", val.doubleValue());
                } else if (vType.contains("WEIGHT")) {
                    vitalsByDate.get(dateKey).put("weight", val.doubleValue());
                }
            }
        }
        List<Map<String, Object>> vitalsTimeline = new ArrayList<>(vitalsByDate.values());

        // 6. Labs Timeline
        var labReports = labReportRepository.findByPatientIdOrderByReportedAtDesc(patientId);
        List<Map<String, Object>> labsTimeline = new ArrayList<>();
        for (var lab : labReports) {
            Map<String, Object> lMap = new LinkedHashMap<>();
            lMap.put("id", lab.getId());
            lMap.put("test_name", lab.getTestName());
            lMap.put("value", lab.getResultValue());
            lMap.put("unit", lab.getUnit());
            lMap.put("flag", lab.getFlag());
            lMap.put("timestamp", lab.getReportedAt() != null ? lab.getReportedAt().toString() : "");
            labsTimeline.add(lMap);
        }

        // 7. Calculate Trajectory Deltas
        double sbpDelta = 0.0;
        double dbpDelta = 0.0;
        if (vitalsTimeline.size() >= 2) {
            var first = vitalsTimeline.get(0);
            var last = vitalsTimeline.get(vitalsTimeline.size() - 1);
            Double sFirst = (Double) first.get("systolic");
            Double sLast = (Double) last.get("systolic");
            if (sFirst != null && sLast != null) sbpDelta = sLast - sFirst;

            Double dFirst = (Double) first.get("diastolic");
            Double dLast = (Double) last.get("diastolic");
            if (dFirst != null && dLast != null) dbpDelta = dLast - dFirst;
        }

        double glucoseDelta = 0.0;
        double creatDelta = 0.0;
        List<Double> glucoseVals = new ArrayList<>();
        List<Double> creatVals = new ArrayList<>();

        for (var l : labsTimeline) {
            String tName = String.valueOf(l.get("test_name")).toLowerCase();
            String valStr = String.valueOf(l.get("value"));
            try {
                double parsed = Double.parseDouble(valStr.replaceAll("[^0-9.]", ""));
                if (tName.contains("glucose") || tName.contains("sugar")) {
                    glucoseVals.add(parsed);
                } else if (tName.contains("creatinine")) {
                    creatVals.add(parsed);
                }
            } catch (Exception ignored) {}
        }

        if (glucoseVals.size() >= 2) {
            glucoseDelta = glucoseVals.get(0) - glucoseVals.get(glucoseVals.size() - 1);
        }
        if (creatVals.size() >= 2) {
            creatDelta = creatVals.get(0) - creatVals.get(creatVals.size() - 1);
        }

        // Trajectory direction
        String trajectory = "STABLE";
        int worsening = 0;
        int improving = 0;
        if (sbpDelta > 10.0) worsening++; else if (sbpDelta < -10.0) improving++;
        if (glucoseDelta > 20.0) worsening++; else if (glucoseDelta < -20.0) improving++;
        if (creatDelta > 0.3) worsening += 2; else if (creatDelta < -0.2) improving++;

        if (worsening >= 2) {
            trajectory = "DETERIORATING";
        } else if (improving >= 2 && worsening == 0) {
            trajectory = "IMPROVING";
        }

        Map<String, Object> signals = new LinkedHashMap<>();
        signals.put("sbp_delta", sbpDelta);
        signals.put("dbp_delta", dbpDelta);
        signals.put("glucose_delta", glucoseDelta);
        signals.put("creatinine_delta", creatDelta);
        signals.put("trajectory", trajectory);

        Map<String, Object> payload = new LinkedHashMap<>(baseFeatures);
        payload.put("patient_id", patientId);
        payload.put("age", age);
        payload.put("gender", gender);
        payload.put("diagnoses", diagnosisNames);
        payload.put("medications", activeMeds);
        payload.put("vitals_timeline", vitalsTimeline);
        payload.put("labs_timeline", labsTimeline);
        payload.put("encounters_timeline", encountersTimeline);
        payload.put("longitudinal_signals", signals);

        return payload;
    }
}
