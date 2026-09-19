package com.consentcare.core.service;

import com.consentcare.core.model.*;
import com.consentcare.core.repository.DoctorRepository;
import com.consentcare.core.repository.RiskPredictionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RiskService {

    private final EhrFeatureService ehrFeatureService;
    private final RiskPredictionRepository riskPredictionRepository;
    private final DoctorRepository doctorRepository;
    private final WebClient riskServiceClient;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public Map<String, Object> predictForPatient(Long patientId, User doctorUser) {
        Doctor doctor = doctorRepository.findByUserId(doctorUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only medical doctors can request ML risk predictions."));

        Map<String, Object> features = ehrFeatureService.extractFeatures(patientId);

        // 1. Check for Insufficient Data before calling ML service
        boolean hasSufficient = (Boolean) features.getOrDefault("has_sufficient_data", true);
        if (!hasSufficient) {
            String completeness = (String) features.getOrDefault("data_completeness", "INCOMPLETE");
            List<?> missing = (List<?>) features.getOrDefault("missing_features", List.of());

            try {
                String featuresJson = objectMapper.writeValueAsString(features);
                RiskPrediction rp = RiskPrediction.builder()
                        .patientId(patientId)
                        .requestedByDoctorId(doctor.getId())
                        .modelVersion("readmission-risk v1.0")
                        .riskScore(null)
                        .riskLevel("INSUFFICIENT_DATA")
                        .status("INSUFFICIENT_DATA")
                        .dataCompleteness(completeness)
                        .notes("Insufficient information for this research risk assessment. Missing required clinical history: " + String.join(", ", missing.stream().map(Object::toString).toList()))
                        .contributingFactorsJson("{}")
                        .featuresUsedJson(featuresJson)
                        .clinicalDisclaimer("Research decision-support only. This is not a diagnosis or treatment recommendation.")
                        .createdAt(OffsetDateTime.now())
                        .build();
                riskPredictionRepository.save(rp);

                auditService.logAction(doctorUser.getUsername(), doctorUser.getRole().name(), "ML_RISK_PREDICTION",
                        "RiskPrediction", rp.getId().toString(), "INSUFFICIENT_DATA", "Insufficient clinical history for patient " + patientId);

                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("id", rp.getId());
                resp.put("patient_id", patientId);
                resp.put("status", "INSUFFICIENT_DATA");
                resp.put("risk_label", "INSUFFICIENT_DATA");
                resp.put("risk_probability", null);
                resp.put("model_version", "readmission-risk v1.0");
                resp.put("data_completeness", completeness);
                resp.put("missing_features", missing);
                resp.put("message", "Insufficient information for this research risk assessment. Minimum clinical encounter history and patient demographics are required.");
                resp.put("clinical_disclaimer", rp.getClinicalDisclaimer());
                resp.put("created_at", rp.getCreatedAt());
                return resp;
            } catch (Exception e) {
                log.error("Failed to persist insufficient data record", e);
            }
        }

        // 2. Call risk-service for supervised ML inference
        try {
            Map<String, Object> mlResult = riskServiceClient.post()
                    .uri("/predict")
                    .bodyValue(features)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            String status = (String) mlResult.getOrDefault("status", "COMPLETED");
            if ("INSUFFICIENT_DATA".equals(status)) {
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("patient_id", patientId);
                resp.put("status", "INSUFFICIENT_DATA");
                resp.put("risk_label", "INSUFFICIENT_DATA");
                resp.put("risk_probability", null);
                resp.put("model_version", mlResult.getOrDefault("model_version", "readmission-risk v1.0"));
                resp.put("data_completeness", mlResult.getOrDefault("data_completeness", "PARTIAL"));
                resp.put("message", mlResult.getOrDefault("message", "Insufficient information for this research risk assessment."));
                resp.put("clinical_disclaimer", "Research decision-support only. This is not a diagnosis or treatment recommendation.");
                return resp;
            }

            Number proba = (Number) mlResult.getOrDefault("risk_probability", 0.0);
            String label = (String) mlResult.getOrDefault("risk_label", "LOW");
            String modelVersion = (String) mlResult.getOrDefault("model_version", "readmission-risk v1.0");
            Object factors = mlResult.get("top_contributing_factors");

            String factorsJson = objectMapper.writeValueAsString(factors);
            String featuresJson = objectMapper.writeValueAsString(features);

            RiskPrediction rp = RiskPrediction.builder()
                    .patientId(patientId)
                    .requestedByDoctorId(doctor.getId())
                    .modelVersion(modelVersion)
                    .riskScore(new BigDecimal(proba.toString()))
                    .riskLevel(label)
                    .status("COMPLETED")
                    .dataCompleteness("COMPLETE (100%)")
                    .contributingFactorsJson(factorsJson)
                    .featuresUsedJson(featuresJson)
                    .clinicalDisclaimer("Research decision-support only. This prediction is not a medical diagnosis.")
                    .createdAt(OffsetDateTime.now())
                    .build();
            rp = riskPredictionRepository.save(rp);

            auditService.logAction(doctorUser.getUsername(), doctorUser.getRole().name(), "ML_RISK_PREDICTION",
                    "RiskPrediction", rp.getId().toString(), "SUCCESS", "Calculated " + label + " risk (" + proba + ") for patient " + patientId);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("id", rp.getId());
            resp.put("patient_id", patientId);
            resp.put("status", "COMPLETED");
            resp.put("risk_probability", proba);
            resp.put("risk_label", label);
            resp.put("model_version", modelVersion);
            resp.put("top_contributing_factors", factors != null ? factors : Map.of());
            resp.put("features_used", features);
            resp.put("data_completeness", "COMPLETE (100%)");
            resp.put("clinical_disclaimer", rp.getClinicalDisclaimer());
            resp.put("created_at", rp.getCreatedAt());
            return resp;
        } catch (Exception e) {
            log.error("Failed to run risk prediction via risk-service", e);
            throw new RuntimeException("Risk service unavailable or prediction failed: " + e.getMessage(), e);
        }
    }

    public List<RiskPrediction> listPredictions(Long patientId, User actor) {
        auditService.logAction(actor.getUsername(), actor.getRole().name(), "LIST_RISK_PREDICTIONS",
                "Patient", patientId.toString(), "SUCCESS", "Viewed risk predictions");
        return riskPredictionRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    public Map<String, Object> getModelMetrics() {
        try {
            return riskServiceClient.get().uri("/model/metrics").retrieve().bodyToMono(Map.class).block();
        } catch (Exception e) {
            log.warn("Could not retrieve metrics from risk-service: {}", e.getMessage());
            return Map.of("error", "Metrics unavailable");
        }
    }
}
