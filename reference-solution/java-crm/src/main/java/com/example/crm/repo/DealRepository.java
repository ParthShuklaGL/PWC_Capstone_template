package com.example.crm.repo;

import com.example.crm.domain.Deal;
import com.example.crm.domain.DealStage;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface DealRepository extends JpaRepository<Deal, Long>, JpaSpecificationExecutor<Deal> {

    @Override
    @EntityGraph(attributePaths = {"contact", "contact.account"})
    Page<Deal> findAll(Specification<Deal> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"contact", "contact.account"})
    Optional<Deal> findById(Long id);

    boolean existsByContactId(long contactId);

    /** One GROUP BY in the database: the count and the sum are computed by MySQL. */
    @Query("select d.stage as stage, count(d) as deals, coalesce(sum(d.value), 0) as total from Deal d group by d.stage")
    List<StageTotal> totalsByStage();

    interface StageTotal {
        DealStage getStage();
        long getDeals();
        BigDecimal getTotal();
    }
}
