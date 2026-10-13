package com.example.crm.repo;

import com.example.crm.domain.Contact;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ContactRepository extends JpaRepository<Contact, Long>, JpaSpecificationExecutor<Contact> {

    /** Loads each contact together with its account, so the list does not issue one query per row. */
    @Override
    @EntityGraph(attributePaths = "account")
    Page<Contact> findAll(Specification<Contact> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "account")
    java.util.Optional<Contact> findById(Long id);

    boolean existsByAccountId(long accountId);

    long countByAccountId(long accountId);

    /** Pairs of (account id, contact count) for a page of accounts. */
    @Query("select c.account.id, count(c) from Contact c where c.account.id in :ids group by c.account.id")
    List<Object[]> countByAccountIds(Collection<Long> ids);
}
