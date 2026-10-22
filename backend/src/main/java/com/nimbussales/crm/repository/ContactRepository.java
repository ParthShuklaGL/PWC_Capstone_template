package com.nimbussales.crm.repository;

import com.nimbussales.crm.domain.Contact;
import com.nimbussales.crm.domain.ContactStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContactRepository extends JpaRepository<Contact, Long> {

    Page<Contact> findByStatus(ContactStatus status, Pageable pageable);

    Optional<Contact> findByContactRef(String contactRef);

    boolean existsByContactRef(String contactRef);

    List<Contact> findByAccountIdOrderByLastNameAsc(Long accountId);

    List<Contact> findByEmailIgnoreCase(String email);

    @Query("""
            select c from Contact c
            where lower(c.firstName) like lower(concat('%', :term, '%'))
               or lower(c.lastName) like lower(concat('%', :term, '%'))
               or lower(c.email) like lower(concat('%', :term, '%'))
            order by c.lastName, c.firstName
            """)
    List<Contact> search(@Param("term") String term);

    Optional<Contact> findTopByOrderByIdDesc();
}
