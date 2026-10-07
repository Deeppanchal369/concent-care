package com.consentcare.core.repository;

import com.consentcare.core.model.DatasetRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DatasetRegistryRepository extends JpaRepository<DatasetRegistry, Long> {
    Optional<DatasetRegistry> findByDatasetName(String datasetName);
}

