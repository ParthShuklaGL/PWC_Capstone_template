package com.nimbussales.crm.repository;

import com.nimbussales.crm.domain.DealStageChange;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DealStageChangeRepository extends JpaRepository<DealStageChange, Long> {

    List<DealStageChange> findByDealIdOrderByChangedAtAscIdAsc(Long dealId);
}
