package com.example.crm.service;

import com.example.crm.domain.Contact;
import com.example.crm.domain.Deal;
import com.example.crm.domain.DealStage;
import com.example.crm.domain.Times;
import com.example.crm.repo.ContactRepository;
import com.example.crm.repo.DealRepository;
import com.example.crm.web.ApiException;
import com.example.crm.web.dto.CrmDtos.DealDto;
import com.example.crm.web.dto.CrmDtos.DealInput;
import com.example.crm.web.dto.CrmDtos.PageResult;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DealService {
    /** The column is decimal(18,2); stay well inside it. */
    private static final BigDecimal MAX_VALUE = new BigDecimal("1000000000000");

    private final DealRepository deals;
    private final ContactRepository contacts;
    private final Clock clock;

    public DealService(DealRepository deals, ContactRepository contacts, Clock clock) {
        this.deals = deals;
        this.contacts = contacts;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResult<DealDto> list(int page, int size, String search, DealStage stage, Long contactId, Long accountId) {
        Validation.start().paging(page, size).maxLength("Search", search, 100).throwIfAny();

        Specification<Deal> spec = null;
        if (stage != null) {
            spec = Specs.and(spec, (root, q, cb) -> cb.equal(root.get("stage"), stage));
        }
        if (contactId != null) {
            spec = Specs.and(spec, (root, q, cb) -> cb.equal(root.get("contact").get("id"), contactId));
        }
        if (accountId != null) {
            spec = Specs.and(spec,
                    (root, q, cb) -> cb.equal(root.get("contact").get("account").get("id"), accountId));
        }
        if (search != null && !search.isBlank()) {
            spec = Specs.and(spec, Specs.containsAny(search.strip(), "title"));
        }
        Page<Deal> found = deals.findAll(spec, PageRequest.of(page, size, Sort.by("expectedCloseDate", "id")));
        return new PageResult<>(found.map(DealDto::from).toList(), page, size, found.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DealDto get(long id) {
        return DealDto.from(deals.findById(id).orElseThrow(ApiException::dealNotFound));
    }

    @Transactional
    public DealDto create(DealInput input) {
        validate(input);
        Contact contact = contacts.findById(input.contactId()).orElseThrow(ApiException::contactNotFound);
        Instant now = Times.now(clock);
        Deal deal = new Deal();
        deal.setCreatedAt(now);
        deal.setUpdatedAt(now);
        applyRules(deal, input, contact, LocalDate.ofInstant(now, ZoneOffset.UTC));
        deals.save(deal);
        return DealDto.from(deal);
    }

    @Transactional
    public DealDto update(long id, DealInput input) {
        validate(input);
        Deal deal = deals.findById(id).orElseThrow(ApiException::dealNotFound);
        Contact contact = contacts.findById(input.contactId()).orElseThrow(ApiException::contactNotFound);
        Instant now = Times.now(clock);
        applyRules(deal, input, contact, LocalDate.ofInstant(now, ZoneOffset.UTC));
        deal.setUpdatedAt(now);
        return DealDto.from(deal);
    }

    @Transactional
    public void delete(long id) {
        deals.delete(deals.findById(id).orElseThrow(ApiException::dealNotFound));
    }

    private static void validate(DealInput input) {
        Validation v = Validation.start()
                .greaterThanZero("ContactId", input.contactId())
                .notEmpty("Title", input.title()).maxLength("Title", input.title(), 200)
                .maxLength("LostReason", input.lostReason(), 500);
        if (input.value() != null) {
            v.money("Value", input.value(), MAX_VALUE);
        }
        if (input.expectedCloseDate() == null) {
            v.error("ExpectedCloseDate", "'Expected Close Date' must not be empty.");
        }
        if (input.stage() == DealStage.LOST && (input.lostReason() == null || input.lostReason().isBlank())) {
            v.error("LostReason", "Say why the deal was lost.");
        }
        v.throwIfAny();
    }

    /**
     * The one place the stage rules live, used by create and update. closedDate is never taken from the caller: it is
     * today (UTC) when a deal becomes WON or LOST, kept on later edits of a closed deal, and cleared when reopened.
     * lostReason is kept only for LOST.
     */
    private static void applyRules(Deal deal, DealInput input, Contact contact, LocalDate today) {
        DealStage stage = input.stage() == null ? DealStage.PROSPECTING : input.stage();
        boolean wasClosed = deal.getStage().isClosed();

        deal.setContact(contact);
        deal.setTitle(input.title().strip());
        deal.setValue(input.value() == null ? BigDecimal.ZERO : input.value());
        deal.setExpectedCloseDate(input.expectedCloseDate());
        deal.setStage(stage);
        deal.setLostReason(stage == DealStage.LOST ? Validation.clean(input.lostReason()) : null);

        if (!stage.isClosed()) {
            deal.setClosedDate(null);
        } else if (!wasClosed || deal.getClosedDate() == null) {
            deal.setClosedDate(today);
        }
    }
}
