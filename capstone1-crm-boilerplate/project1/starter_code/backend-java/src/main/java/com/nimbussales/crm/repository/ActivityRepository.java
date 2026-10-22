package com.nimbussales.crm.repository;

import com.nimbussales.crm.domain.Activity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByContactIdOrderByOccurredAtDesc(Long contactId);
}
