package com.example.crm.service;

import com.example.crm.domain.Account;
import com.example.crm.repo.AccountRepository;
import com.example.crm.repo.ContactRepository;
import com.example.crm.web.ApiException;
import com.example.crm.web.dto.CrmDtos.AccountDto;
import com.example.crm.web.dto.CrmDtos.AccountInput;
import com.example.crm.web.dto.CrmDtos.PageResult;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
    private final AccountRepository accounts;
    private final ContactRepository contacts;

    public AccountService(AccountRepository accounts, ContactRepository contacts) {
        this.accounts = accounts;
        this.contacts = contacts;
    }

    @Transactional(readOnly = true)
    public PageResult<AccountDto> list(int page, int size, String search) {
        Validation.start().paging(page, size).maxLength("Search", search, 100).throwIfAny();

        Specification<Account> spec = null;
        if (search != null && !search.isBlank()) {
            spec = Specs.containsAny(search.strip(), "name");
        }
        Page<Account> found = accounts.findAll(spec, PageRequest.of(page, size, Sort.by("name", "id")));

        Map<Long, Long> counts = new HashMap<>();
        if (!found.isEmpty()) {
            for (Object[] row : contacts.countByAccountIds(found.map(Account::getId).toList())) {
                counts.put((Long) row[0], (Long) row[1]);
            }
        }
        List<AccountDto> items = found.map(a -> AccountDto.from(a, counts.getOrDefault(a.getId(), 0L))).toList();
        return new PageResult<>(items, page, size, found.getTotalElements());
    }

    @Transactional(readOnly = true)
    public AccountDto get(long id) {
        Account account = accounts.findById(id).orElseThrow(ApiException::accountNotFound);
        return AccountDto.from(account, contacts.countByAccountId(id));
    }

    @Transactional
    public AccountDto create(AccountInput input) {
        validate(input);
        Account account = new Account();
        apply(account, input);
        accounts.save(account);
        return AccountDto.from(account, 0);
    }

    @Transactional
    public AccountDto update(long id, AccountInput input) {
        validate(input);
        Account account = accounts.findById(id).orElseThrow(ApiException::accountNotFound);
        apply(account, input);
        return AccountDto.from(account, contacts.countByAccountId(id));
    }

    @Transactional
    public void delete(long id) {
        Account account = accounts.findById(id).orElseThrow(ApiException::accountNotFound);
        // The foreign key would refuse anyway; asking first gives the caller a clear 409 instead of a database error.
        if (contacts.existsByAccountId(id)) {
            throw ApiException.accountHasContacts();
        }
        accounts.delete(account);
    }

    private static void validate(AccountInput input) {
        Validation.start()
                .notEmpty("Name", input.name())
                .maxLength("Name", input.name(), 200)
                .maxLength("Industry", input.industry(), 80)
                .maxLength("Country", input.country(), 80)
                .maxLength("Website", input.website(), 200)
                .httpUrl("Website", input.website())
                .throwIfAny();
    }

    private static void apply(Account account, AccountInput input) {
        account.setName(input.name().strip());
        account.setIndustry(Validation.clean(input.industry()));
        account.setCountry(Validation.clean(input.country()));
        account.setWebsite(Validation.clean(input.website()));
    }
}
