package com.nimbussales.crm.repository;

import com.nimbussales.crm.domain.Account;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findAllByOrderByNameAsc();

    Optional<Account> findByAccountRef(String accountRef);

    Optional<Account> findTopByOrderByIdDesc();
}
