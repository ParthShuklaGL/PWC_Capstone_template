package com.nimbussales.crm.web;

import com.nimbussales.crm.domain.ActivityType;
import com.nimbussales.crm.domain.Contact;
import com.nimbussales.crm.domain.ContactStatus;
import com.nimbussales.crm.service.ActivityService;
import com.nimbussales.crm.service.ContactImportService;
import com.nimbussales.crm.service.ContactService;
import com.nimbussales.crm.service.DealService;
import com.nimbussales.crm.web.dto.ActivityCreateRequest;
import com.nimbussales.crm.web.dto.ActivityResponse;
import com.nimbussales.crm.web.dto.ContactCreateRequest;
import com.nimbussales.crm.web.dto.ContactSummaryResponse;
import com.nimbussales.crm.web.dto.ContactUpdateRequest;
import com.nimbussales.crm.web.dto.DealResponse;
import com.nimbussales.crm.web.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contacts")
@Tag(name = "Contacts")
public class ContactsController {

    private final ContactService contactService;
    private final ContactImportService importService;
    private final ActivityService activityService;
    private final DealService dealService;

    public ContactsController(ContactService contactService, ContactImportService importService,
                              ActivityService activityService, DealService dealService) {
        this.contactService = contactService;
        this.importService = importService;
        this.activityService = activityService;
        this.dealService = dealService;
    }

    @GetMapping
    @Operation(summary = "One page of contacts, in surname order")
    public PageResponse<ContactSummaryResponse> list(@RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "20") int size,
                                                     @RequestParam(required = false) String status) {
        ContactStatus filter = status == null || status.isBlank()
                ? null
                : ContactStatus.valueOf(status.toUpperCase(Locale.ROOT));
        return PageResponse.from(contactService.list(page, size, filter), ContactSummaryResponse::from);
    }

    @GetMapping("/search")
    @Operation(summary = "Find contacts by name or email")
    public List<ContactSummaryResponse> search(@RequestParam String q) {
        return contactService.search(q).stream().map(ContactSummaryResponse::from).toList();
    }

    @GetMapping("/{contactRef}")
    @Operation(summary = "One contact")
    public Contact get(@PathVariable String contactRef) {
        return contactService.getByRef(contactRef);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a contact to an account (ADMIN)")
    public ContactSummaryResponse create(@Valid @RequestBody ContactCreateRequest request) {
        return ContactSummaryResponse.from(contactService.create(request.accountRef(), request.firstName(),
                request.lastName(), request.email(), request.phone(), request.jobTitle()));
    }

    @PutMapping("/{contactRef}")
    @Operation(summary = "Update a contact (ADMIN)")
    public ContactSummaryResponse update(@PathVariable String contactRef,
                                         @Valid @RequestBody ContactUpdateRequest request) {
        ContactStatus status = request.status() == null || request.status().isBlank()
                ? null
                : ContactStatus.valueOf(request.status().toUpperCase(Locale.ROOT));
        return ContactSummaryResponse.from(contactService.update(contactRef, request.firstName(),
                request.lastName(), request.email(), request.phone(), request.jobTitle(), status));
    }

    @PostMapping(path = "/import", consumes = "text/csv", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Bulk import leads from the agency's monthly CSV (ADMIN)")
    public String importCsv(@RequestBody String csv) {
        return importService.importCsv(csv);
    }

    @GetMapping("/{contactRef}/activities")
    @Operation(summary = "Everything logged against this contact, newest first")
    public List<ActivityResponse> activities(@PathVariable String contactRef) {
        return activityService.listForContact(contactRef).stream().map(ActivityResponse::from).toList();
    }

    @PostMapping("/{contactRef}/activities")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Log an interaction")
    public ActivityResponse logActivity(@PathVariable String contactRef,
                                        @Valid @RequestBody ActivityCreateRequest request) {
        return ActivityResponse.from(activityService.log(contactRef,
                ActivityType.valueOf(request.type().toUpperCase(Locale.ROOT)),
                request.subject(), request.notes(),
                request.occurredAt() == null ? null : request.occurredAt().toInstant()));
    }

    @GetMapping("/{contactRef}/deals")
    @Operation(summary = "The deals this contact is driving", tags = "Deals")
    public List<DealResponse> deals(@PathVariable String contactRef) {
        return dealService.listForContact(contactRef).stream().map(DealResponse::from).toList();
    }
}
