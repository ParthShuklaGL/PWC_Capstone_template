package com.example.crm.repo;

import com.example.crm.domain.Account;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface AccountRepository extends JpaRepository<Account, Long>, JpaSpecificationExecutor<Account> {

    /** One row per account with the number of its contacts, counted by MySQL, biggest first. */
    @Query("""
            select a.id as accountId, a.name as account, count(c) as contacts
            from Account a left join Contact c on c.account = a
            group by a.id, a.name
            order by count(c) desc, a.name asc
            """)
    List<ContactsPerAccount> contactsPerAccount();

    interface ContactsPerAccount {
        long getAccountId();
        String getAccount();
        long getContacts();
    }
}
