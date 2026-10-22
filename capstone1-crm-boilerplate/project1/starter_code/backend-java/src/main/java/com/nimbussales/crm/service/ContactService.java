package com.nimbussales.crm.service;

import com.nimbussales.crm.domain.Account;
import com.nimbussales.crm.domain.Contact;
import com.nimbussales.crm.domain.ContactStatus;
import com.nimbussales.crm.repository.AccountRepository;
import com.nimbussales.crm.repository.ContactRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContactService {

    private final ContactRepository contacts;
    private final AccountRepository accounts;
    private final AuditLogger audit;

    public ContactService(ContactRepository contacts, AccountRepository accounts, AuditLogger audit) {
        this.contacts = contacts;
        this.accounts = accounts;
        this.audit = audit;
    }

    /**
     * One page of contacts, in surname order, optionally filtered by status.
     *
     * <p>The contact list screen shows twenty at a time.
     */
    @Transactional(readOnly = true)
    public Page<Contact> list(int page, int size, ContactStatus status) {
        PageRequest request = PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100));
        Page<Contact> found = status == null
                ? contacts.findAll(request)
                : contacts.findByStatus(status, request);
        // Surname first, then forename, the way the screen expects to display them.
        List<Contact> ordered = found.getContent().stream()
                .sorted(Comparator.comparing(Contact::getLastName, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(Contact::getFirstName, String.CASE_INSENSITIVE_ORDER))
                .toList();
        audit.listed("contact", ordered.size());
        return new PageImpl<>(ordered, request, found.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<Contact> search(String q) {
        List<Contact> results = contacts.search(q == null ? "" : q.trim());
        audit.listed("contact", results.size());
        return results;
    }

    @Transactional(readOnly = true)
    public Contact getByRef(String contactRef) {
        Contact contact = contacts.findByContactRef(contactRef)
                .orElseThrow(() -> NotFoundException.contact(contactRef));
        audit.viewed("contact", contactRef);
        return contact;
    }

    @Transactional(readOnly = true)
    public List<Contact> listForAccount(String accountRef) {
        Account account = accounts.findByAccountRef(accountRef)
                .orElseThrow(() -> NotFoundException.account(accountRef));
        List<Contact> people = contacts.findByAccountIdOrderByLastNameAsc(account.getId());
        audit.listed("contact", people.size());
        return people;
    }

    @Transactional
    public Contact create(String accountRef, String firstName, String lastName, String email,
                          String phone, String jobTitle) {
        Account account = accounts.findByAccountRef(accountRef)
                .orElseThrow(() -> NotFoundException.account(accountRef));
        String contactRef = References.next("C", 5,
                contacts.findTopByOrderByIdDesc().map(Contact::getContactRef).orElse(null));
        Contact contact = new Contact(contactRef, account, firstName, lastName, email);
        contact.setPhone(phone);
        contact.setJobTitle(jobTitle);
        contacts.save(contact);
        audit.created("contact", contactRef);
        return contact;
    }

    @Transactional
    public Contact update(String contactRef, String firstName, String lastName, String email,
                          String phone, String jobTitle, ContactStatus status) {
        Contact contact = contacts.findByContactRef(contactRef)
                .orElseThrow(() -> NotFoundException.contact(contactRef));
        contact.setFirstName(firstName);
        contact.setLastName(lastName);
        contact.setEmail(email);
        contact.setPhone(phone);
        contact.setJobTitle(jobTitle);
        if (status != null) {
            contact.setStatus(status);
        }
        audit.updated("contact", contactRef);
        return contact;
    }
}
