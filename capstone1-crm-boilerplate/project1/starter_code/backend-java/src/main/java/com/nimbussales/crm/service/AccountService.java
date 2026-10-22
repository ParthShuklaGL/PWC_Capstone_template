package com.nimbussales.crm.service;

import com.nimbussales.crm.domain.Account;
import com.nimbussales.crm.repository.AccountRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final AccountRepository accounts;
    private final AuditLogger audit;

    public AccountService(AccountRepository accounts, AuditLogger audit) {
        this.accounts = accounts;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<Account> list() {
        List<Account> all = accounts.findAllByOrderByNameAsc();
        audit.listed("account", all.size());
        return all;
    }

    @Transactional(readOnly = true)
    public Account getByRef(String accountRef) {
        Account account = accounts.findByAccountRef(accountRef)
                .orElseThrow(() -> NotFoundException.account(accountRef));
        audit.viewed("account", accountRef);
        return account;
    }

    @Transactional
    public Account create(String name, String industry, String country, String website) {
        String accountRef = References.next("A", 4,
                accounts.findTopByOrderByIdDesc().map(Account::getAccountRef).orElse(null));
        Account account = accounts.save(new Account(accountRef, name.trim(), industry, country, website));
        audit.created("account", accountRef);
        return account;
    }

    @Transactional
    public Account update(String accountRef, String name, String industry, String country, String website) {
        Account account = accounts.findByAccountRef(accountRef)
                .orElseThrow(() -> NotFoundException.account(accountRef));
        account.update(name.trim(), industry, country, website);
        audit.updated("account", accountRef);
        return account;
    }
}
