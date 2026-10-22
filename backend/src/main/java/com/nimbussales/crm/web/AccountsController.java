package com.nimbussales.crm.web;

import com.nimbussales.crm.service.AccountService;
import com.nimbussales.crm.service.ContactService;
import com.nimbussales.crm.web.dto.AccountRequest;
import com.nimbussales.crm.web.dto.AccountResponse;
import com.nimbussales.crm.web.dto.ContactSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/accounts")
@Tag(name = "Accounts")
public class AccountsController {

    private final AccountService accountService;
    private final ContactService contactService;

    public AccountsController(AccountService accountService, ContactService contactService) {
        this.accountService = accountService;
        this.contactService = contactService;
    }

    @GetMapping
    @Operation(summary = "Every account, by name")
    public List<AccountResponse> list() {
        return accountService.list().stream().map(AccountResponse::from).toList();
    }

    @GetMapping("/{accountRef}")
    @Operation(summary = "One account")
    public AccountResponse get(@PathVariable String accountRef) {
        return AccountResponse.from(accountService.getByRef(accountRef));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add an account (ADMIN)")
    public AccountResponse create(@Valid @RequestBody AccountRequest request) {
        return AccountResponse.from(accountService.create(
                request.name(), request.industry(), request.country(), request.website()));
    }

    @PutMapping("/{accountRef}")
    @Operation(summary = "Update an account (ADMIN)")
    public AccountResponse update(@PathVariable String accountRef, @Valid @RequestBody AccountRequest request) {
        return AccountResponse.from(accountService.update(
                accountRef, request.name(), request.industry(), request.country(), request.website()));
    }

    @GetMapping("/{accountRef}/contacts")
    @Operation(summary = "The people at this account")
    public List<ContactSummaryResponse> contacts(@PathVariable String accountRef) {
        return contactService.listForAccount(accountRef).stream().map(ContactSummaryResponse::from).toList();
    }
}
