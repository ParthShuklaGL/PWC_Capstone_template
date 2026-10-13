package com.example.crm.web;

import com.example.crm.domain.ContactStatus;
import com.example.crm.domain.DealStage;
import com.example.crm.service.AccountService;
import com.example.crm.service.ContactService;
import com.example.crm.service.DealService;
import com.example.crm.web.dto.CrmDtos.AccountDto;
import com.example.crm.web.dto.CrmDtos.AccountInput;
import com.example.crm.web.dto.CrmDtos.ContactDto;
import com.example.crm.web.dto.CrmDtos.ContactInput;
import com.example.crm.web.dto.CrmDtos.DealDto;
import com.example.crm.web.dto.CrmDtos.DealInput;
import com.example.crm.web.dto.CrmDtos.PageResult;
import java.net.URI;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Accounts, contacts and deals: list, get, create, update, delete (delete is ADMIN only, enforced in SecurityConfig).
 * Ids are digits only, so /api/accounts/abc is a 404 like it is in the .NET API.
 */
@RestController
@RequestMapping("/api")
public class CrmController {
    private final AccountService accounts;
    private final ContactService contacts;
    private final DealService deals;

    public CrmController(AccountService accounts, ContactService contacts, DealService deals) {
        this.accounts = accounts;
        this.contacts = contacts;
        this.deals = deals;
    }

    // ---- accounts ----

    @GetMapping("/accounts")
    public PageResult<AccountDto> listAccounts(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @RequestParam(required = false) String search) {
        return accounts.list(page, size, search);
    }

    @GetMapping("/accounts/{id:\\d+}")
    public AccountDto getAccount(@PathVariable long id) {
        return accounts.get(id);
    }

    @PostMapping("/accounts")
    public ResponseEntity<AccountDto> createAccount(@RequestBody AccountInput input) {
        AccountDto created = accounts.create(input);
        return ResponseEntity.created(URI.create("/api/accounts/" + created.id())).body(created);
    }

    @PutMapping("/accounts/{id:\\d+}")
    public AccountDto updateAccount(@PathVariable long id, @RequestBody AccountInput input) {
        return accounts.update(id, input);
    }

    @DeleteMapping("/accounts/{id:\\d+}")
    public ResponseEntity<Void> deleteAccount(@PathVariable long id) {
        accounts.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ---- contacts ----

    @GetMapping("/contacts")
    public PageResult<ContactDto> listContacts(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @RequestParam(required = false) String search,
                                               @RequestParam(required = false) Long accountId,
                                               @RequestParam(required = false) String status) {
        return contacts.list(page, size, search, accountId, parseName(ContactStatus.class, status, "status"));
    }

    @GetMapping("/contacts/{id:\\d+}")
    public ContactDto getContact(@PathVariable long id) {
        return contacts.get(id);
    }

    @PostMapping("/contacts")
    public ResponseEntity<ContactDto> createContact(@RequestBody ContactInput input) {
        ContactDto created = contacts.create(input);
        return ResponseEntity.created(URI.create("/api/contacts/" + created.id())).body(created);
    }

    @PutMapping("/contacts/{id:\\d+}")
    public ContactDto updateContact(@PathVariable long id, @RequestBody ContactInput input) {
        return contacts.update(id, input);
    }

    @DeleteMapping("/contacts/{id:\\d+}")
    public ResponseEntity<Void> deleteContact(@PathVariable long id) {
        contacts.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ---- deals ----

    @GetMapping("/deals")
    public PageResult<DealDto> listDeals(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size,
                                         @RequestParam(required = false) String search,
                                         @RequestParam(required = false) String stage,
                                         @RequestParam(required = false) Long contactId,
                                         @RequestParam(required = false) Long accountId) {
        return deals.list(page, size, search, parseName(DealStage.class, stage, "stage"), contactId, accountId);
    }

    @GetMapping("/deals/{id:\\d+}")
    public DealDto getDeal(@PathVariable long id) {
        return deals.get(id);
    }

    @PostMapping("/deals")
    public ResponseEntity<DealDto> createDeal(@RequestBody DealInput input) {
        DealDto created = deals.create(input);
        return ResponseEntity.created(URI.create("/api/deals/" + created.id())).body(created);
    }

    @PutMapping("/deals/{id:\\d+}")
    public DealDto updateDeal(@PathVariable long id, @RequestBody DealInput input) {
        return deals.update(id, input);
    }

    @DeleteMapping("/deals/{id:\\d+}")
    public ResponseEntity<Void> deleteDeal(@PathVariable long id) {
        deals.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reads a stage or status filter such as ?stage=WON in any letter case. Numbers are refused, as they are in request
     * bodies. Absent or blank means no filter. The error key is the lower-case query name, as in the .NET API.
     */
    private static <E extends Enum<E>> E parseName(Class<E> type, String raw, String field) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        if (raw.chars().allMatch(Character::isLetter)) {
            for (E value : type.getEnumConstants()) {
                if (value.name().equalsIgnoreCase(raw)) {
                    return value;
                }
            }
        }
        String allowed = Arrays.stream(type.getEnumConstants()).map(Enum::name).collect(Collectors.joining(", "));
        throw new ValidationFailedException(
                java.util.Map.of(field, java.util.List.of("Must be one of: " + allowed + ".")));
    }
}
