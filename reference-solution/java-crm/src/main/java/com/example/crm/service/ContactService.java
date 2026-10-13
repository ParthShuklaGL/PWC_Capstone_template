package com.example.crm.service;

import com.example.crm.domain.Account;
import com.example.crm.domain.Contact;
import com.example.crm.domain.ContactStatus;
import com.example.crm.repo.AccountRepository;
import com.example.crm.repo.ActivityRepository;
import com.example.crm.repo.ContactRepository;
import com.example.crm.repo.DealRepository;
import com.example.crm.web.ApiException;
import com.example.crm.web.dto.CrmDtos.ContactDto;
import com.example.crm.web.dto.CrmDtos.ContactInput;
import com.example.crm.web.dto.CrmDtos.PageResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContactService {
    private final ContactRepository contacts;
    private final AccountRepository accounts;
    private final DealRepository deals;
    private final ActivityRepository activities;

    public ContactService(ContactRepository contacts, AccountRepository accounts, DealRepository deals,
                          ActivityRepository activities) {
        this.contacts = contacts;
        this.accounts = accounts;
        this.deals = deals;
        this.activities = activities;
    }

    @Transactional(readOnly = true)
    public PageResult<ContactDto> list(int page, int size, String search, Long accountId, ContactStatus status) {
        Validation.start().paging(page, size).maxLength("Search", search, 100).throwIfAny();

        Specification<Contact> spec = null;
        if (accountId != null) {
            spec = Specs.and(spec, (root, q, cb) -> cb.equal(root.get("account").get("id"), accountId));
        }
        if (status != null) {
            spec = Specs.and(spec, (root, q, cb) -> cb.equal(root.get("status"), status));
        }
        if (search != null && !search.isBlank()) {
            spec = Specs.and(spec, Specs.containsAny(search.strip(), "firstName", "lastName", "email"));
        }
        Page<Contact> found = contacts.findAll(spec,
                PageRequest.of(page, size, Sort.by("lastName", "firstName", "id")));
        return new PageResult<>(found.map(ContactDto::from).toList(), page, size, found.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ContactDto get(long id) {
        return ContactDto.from(contacts.findById(id).orElseThrow(ApiException::contactNotFound));
    }

    @Transactional
    public ContactDto create(ContactInput input) {
        validate(input);
        Account account = accounts.findById(input.accountId()).orElseThrow(ApiException::accountNotFound);
        Contact contact = new Contact();
        apply(contact, input, account);
        contacts.save(contact);
        return ContactDto.from(contact);
    }

    @Transactional
    public ContactDto update(long id, ContactInput input) {
        validate(input);
        Contact contact = contacts.findById(id).orElseThrow(ApiException::contactNotFound);
        Account account = accounts.findById(input.accountId()).orElseThrow(ApiException::accountNotFound);
        apply(contact, input, account);
        return ContactDto.from(contact);
    }

    @Transactional
    public void delete(long id) {
        Contact contact = contacts.findById(id).orElseThrow(ApiException::contactNotFound);
        if (deals.existsByContactId(id) || activities.existsByContactId(id)) {
            throw ApiException.contactHasHistory();
        }
        contacts.delete(contact);
    }

    private static void validate(ContactInput input) {
        Validation.start()
                .greaterThanZero("AccountId", input.accountId())
                .notEmpty("FirstName", input.firstName()).maxLength("FirstName", input.firstName(), 80)
                .notEmpty("LastName", input.lastName()).maxLength("LastName", input.lastName(), 80)
                .notEmpty("Email", input.email()).maxLength("Email", input.email(), 160)
                .email("Email", input.email())
                .maxLength("Phone", input.phone(), 40)
                .maxLength("JobTitle", input.jobTitle(), 120)
                .throwIfAny();
    }

    private static void apply(Contact contact, ContactInput input, Account account) {
        contact.setAccount(account);
        contact.setFirstName(input.firstName().strip());
        contact.setLastName(input.lastName().strip());
        contact.setEmail(input.email().strip());
        contact.setPhone(Validation.clean(input.phone()));
        contact.setJobTitle(Validation.clean(input.jobTitle()));
        contact.setStatus(input.status() == null ? ContactStatus.PROSPECT : input.status());
    }
}
