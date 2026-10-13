package com.example.crm.repo;

import com.example.crm.domain.Activity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    boolean existsByContactId(long contactId);
}
