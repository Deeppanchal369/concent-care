package com.consentcare.core.repository;

import com.consentcare.core.model.NurseTaskEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NurseTaskEventRepository extends JpaRepository<NurseTaskEvent, Long> {
    List<NurseTaskEvent> findByTaskIdOrderByTimestampAsc(Long taskId);
}

