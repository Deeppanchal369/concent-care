package com.consentcare.core.repository;

import com.consentcare.core.model.ModelVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ModelVersionRepository extends JpaRepository<ModelVersion, Long> {
    Optional<ModelVersion> findByVersion(String version);
    Optional<ModelVersion> findFirstByActiveTrueOrderByTrainedAtDesc();
}

