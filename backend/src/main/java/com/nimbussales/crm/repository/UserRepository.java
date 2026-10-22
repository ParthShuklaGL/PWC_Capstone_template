package com.nimbussales.crm.repository;

import com.nimbussales.crm.domain.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmailIgnoreCase(String email);

    Optional<AppUser> findByUserRef(String userRef);

    List<AppUser> findAllByOrderByIdAsc();
}
