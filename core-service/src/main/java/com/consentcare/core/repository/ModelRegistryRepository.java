package com.consentcare.core.repository;

import com.consentcare.core.model.ModelRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModelRegistryRepository extends JpaRepository<ModelRegistry, Long> {
    Optional<ModelRegistry> findByModelKey(String modelKey);
    List<ModelRegistry> findByDatasetName(String datasetName);
}

