package com.consentcare.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FhirService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public Map<String, Object> getPatientResource(Long patientId) {
        String sql = "SELECT fhir_resource::text FROM fhir_patient_views WHERE patient_id = ?";
        List<String> list = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString(1), patientId);
        if (list.isEmpty()) {
            throw new NoSuchElementException("FHIR Patient not found: " + patientId);
        }
        return parseJson(list.get(0));
    }

    public Map<String, Object> getPractitionerResource(Long userId) {
        String sql = "SELECT fhir_resource::text FROM fhir_practitioner_views WHERE user_id = ?";
        List<String> list = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString(1), userId);
        if (list.isEmpty()) {
            throw new NoSuchElementException("FHIR Practitioner not found: " + userId);
        }
        return parseJson(list.get(0));
    }

    public List<Map<String, Object>> getObservationsForPatient(Long patientId) {
        String sql = "SELECT fhir_resource::text FROM fhir_observation_views WHERE patient_id = ?";
        return jdbcTemplate.query(sql, (rs, rowNum) -> parseJson(rs.getString(1)), patientId);
    }

    public List<Map<String, Object>> getConditionsForPatient(Long patientId) {
        String sql = "SELECT fhir_resource::text FROM fhir_condition_views WHERE patient_id = ?";
        return jdbcTemplate.query(sql, (rs, rowNum) -> parseJson(rs.getString(1)), patientId);
    }

    public List<Map<String, Object>> getMedicationRequestsForPatient(Long patientId) {
        String sql = "SELECT fhir_resource::text FROM fhir_medication_request_views WHERE patient_id = ?";
        return jdbcTemplate.query(sql, (rs, rowNum) -> parseJson(rs.getString(1)), patientId);
    }

    public Map<String, Object> getPatientEverythingBundle(Long patientId) {
        Map<String, Object> patientRes = getPatientResource(patientId);
        List<Map<String, Object>> observations = getObservationsForPatient(patientId);
        List<Map<String, Object>> conditions = getConditionsForPatient(patientId);
        List<Map<String, Object>> medRequests = getMedicationRequestsForPatient(patientId);

        List<Map<String, Object>> entries = new ArrayList<>();
        entries.add(Map.of("resource", patientRes));
        observations.forEach(o -> entries.add(Map.of("resource", o)));
        conditions.forEach(c -> entries.add(Map.of("resource", c)));
        medRequests.forEach(m -> entries.add(Map.of("resource", m)));

        Map<String, Object> bundle = new LinkedHashMap<>();
        bundle.put("resourceType", "Bundle");
        bundle.put("type", "searchset");
        bundle.put("total", entries.size());
        bundle.put("entry", entries);
        return bundle;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String jsonStr) {
        try {
            return objectMapper.readValue(jsonStr, Map.class);
        } catch (Exception e) {
            log.error("Failed to parse FHIR JSON", e);
            return Map.of("raw", jsonStr);
        }
    }
}

