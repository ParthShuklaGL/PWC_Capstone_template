package com.nimbussales.crm.repository;

import com.nimbussales.crm.domain.Deal;
import com.nimbussales.crm.domain.DealStage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Every query that returns deals fetches the account, the contact and the owner with them
 * (the entity graph): the response shows all three names, and there is no lazy loading once
 * the transaction has ended.
 *
 * <p>{@code ownerId} is null for an admin (every deal) and the rep's own id for a USER.
 */
public interface DealRepository extends JpaRepository<Deal, Long> {

    @EntityGraph(attributePaths = {"account", "contact", "owner"})
    @Query("""
            select d from Deal d
            where (:stage is null or d.stage = :stage)
              and (:ownerId is null or d.owner.id = :ownerId)
            """)
    Page<Deal> search(@Param("stage") DealStage stage, @Param("ownerId") Long ownerId, Pageable pageable);

    @EntityGraph(attributePaths = {"account", "contact", "owner"})
    Optional<Deal> findByDealRef(String dealRef);

    @EntityGraph(attributePaths = {"account", "contact", "owner"})
    @Query("""
            select d from Deal d
            where d.contact.id = :contactId
              and (:ownerId is null or d.owner.id = :ownerId)
            order by d.expectedCloseDate, d.id
            """)
    List<Deal> findForContact(@Param("contactId") Long contactId, @Param("ownerId") Long ownerId);

    /** One row per stage that has deals: the stage, how many, and what they are worth. */
    @Query("""
            select new com.nimbussales.crm.repository.StageTotal(d.stage, count(d), coalesce(sum(d.value), 0))
            from Deal d
            where (:ownerId is null or d.owner.id = :ownerId)
            group by d.stage
            """)
    List<StageTotal> totalsByStage(@Param("ownerId") Long ownerId);

    Optional<Deal> findTopByOrderByIdDesc();
}
