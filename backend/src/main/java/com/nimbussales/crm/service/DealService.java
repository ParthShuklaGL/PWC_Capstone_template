package com.nimbussales.crm.service;

import com.nimbussales.crm.domain.Account;
import com.nimbussales.crm.domain.AppUser;
import com.nimbussales.crm.domain.Contact;
import com.nimbussales.crm.domain.ContactStatus;
import com.nimbussales.crm.domain.Deal;
import com.nimbussales.crm.domain.DealStage;
import com.nimbussales.crm.domain.DealStageChange;
import com.nimbussales.crm.domain.DealStageRules;
import com.nimbussales.crm.repository.AccountRepository;
import com.nimbussales.crm.repository.ContactRepository;
import com.nimbussales.crm.repository.DealRepository;
import com.nimbussales.crm.repository.DealStageChangeRepository;
import com.nimbussales.crm.repository.StageTotal;
import com.nimbussales.crm.repository.UserRepository;
import com.nimbussales.crm.security.CurrentUser;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DealService {

    private final DealRepository deals;
    private final DealStageChangeRepository stageChanges;
    private final ContactRepository contacts;
    private final AccountRepository accounts;
    private final UserRepository users;
    private final CurrentUser currentUser;
    private final AuditLogger audit;

    public DealService(DealRepository deals, DealStageChangeRepository stageChanges,
                       ContactRepository contacts, AccountRepository accounts, UserRepository users,
                       CurrentUser currentUser, AuditLogger audit) {
        this.deals = deals;
        this.stageChanges = stageChanges;
        this.contacts = contacts;
        this.accounts = accounts;
        this.users = users;
        this.currentUser = currentUser;
        this.audit = audit;
    }

    /** Null for an admin (sees every deal); the rep's own id for a USER. */
    private Long ownerScope() {
        return currentUser.isAdmin() ? null : currentUser.id();
    }

    /**
     * A rep asking for someone else's deal gets the same 404 as for a deal that does not
     * exist, so the API never confirms that another rep's deal is there.
     */
    private Deal findVisible(String dealRef) {
        Deal deal = deals.findByDealRef(dealRef).orElseThrow(() -> NotFoundException.deal(dealRef));
        Long scope = ownerScope();
        if (scope != null && !scope.equals(deal.getOwner().getId())) {
            throw NotFoundException.deal(dealRef);
        }
        return deal;
    }

    private AppUser findOwner(String ownerRef) {
        return users.findByUserRef(ownerRef).orElseThrow(() ->
                new FieldValidationException("ownerRef", "ownerRef " + ownerRef + " is not a known user"));
    }

    @Transactional(readOnly = true)
    public Page<Deal> list(int page, int size, DealStage stage) {
        // Ordered in the query, before paging: a page is only stable with an ORDER BY, and
        // the order has to be decided before the page is cut.
        PageRequest request = PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100),
                Sort.by("expectedCloseDate").and(Sort.by("id")));
        Page<Deal> found = deals.search(stage, ownerScope(), request);
        audit.listed("deal", found.getNumberOfElements());
        return found;
    }

    @Transactional(readOnly = true)
    public Deal getByRef(String dealRef) {
        Deal deal = findVisible(dealRef);
        audit.viewed("deal", dealRef);
        return deal;
    }

    @Transactional(readOnly = true)
    public List<Deal> listForContact(String contactRef) {
        Contact contact = contacts.findByContactRef(contactRef)
                .orElseThrow(() -> NotFoundException.contact(contactRef));
        List<Deal> found = deals.findForContact(contact.getId(), ownerScope());
        audit.listed("deal", found.size());
        return found;
    }

    @Transactional
    public Deal create(String title, String accountRef, String contactRef, BigDecimal value,
                       LocalDate expectedCloseDate, String ownerRef) {
        Account account = accounts.findByAccountRef(accountRef)
                .orElseThrow(() -> NotFoundException.account(accountRef));
        Contact contact = contacts.findByContactRef(contactRef)
                .orElseThrow(() -> NotFoundException.contact(contactRef));
        if (!contact.getAccountId().equals(account.getId())) {
            throw new FieldValidationException("contactRef",
                    "contact " + contactRef + " does not work at account " + accountRef);
        }
        ensureNotInThePast(expectedCloseDate);
        AppUser owner = ownerRef == null || ownerRef.isBlank()
                ? users.findById(currentUser.id()).orElseThrow()
                : findOwner(ownerRef);

        String dealRef = References.next("D", 5,
                deals.findTopByOrderByIdDesc().map(Deal::getDealRef).orElse(null));
        Deal deal = deals.save(new Deal(dealRef, account, contact, owner, title, value, expectedCloseDate));
        stageChanges.save(new DealStageChange(deal.getId(), null, DealStage.PROSPECTING, deal.getCreatedAt()));
        audit.created("deal", dealRef);
        return deal;
    }

    @Transactional
    public Deal update(String dealRef, String title, BigDecimal value, LocalDate expectedCloseDate,
                       String ownerRef) {
        Deal deal = findVisible(dealRef);
        if (DealStageRules.isFinal(deal.getStage())) {
            throw ConflictException.dealClosed(dealRef);
        }
        if (!expectedCloseDate.equals(deal.getExpectedCloseDate())) {
            ensureNotInThePast(expectedCloseDate);
        }
        if (ownerRef != null && !ownerRef.isBlank()) {
            deal.setOwner(findOwner(ownerRef));
        }
        deal.setTitle(title);
        deal.setValue(value);
        deal.setExpectedCloseDate(expectedCloseDate);
        deal.setUpdatedAt(Instant.now());
        audit.updated("deal", dealRef);
        return deal;
    }

    @Transactional
    public void delete(String dealRef) {
        Deal deal = findVisible(dealRef);
        if (deal.getStage() != DealStage.PROSPECTING) {
            throw ConflictException.deleteNotAllowed(dealRef, deal.getStage().name());
        }
        // The stage history goes with it: ON DELETE CASCADE on deal_stage_changes.deal_id.
        deals.delete(deal);
        audit.deleted("deal", dealRef);
    }

    @Transactional
    public Deal moveToStage(String dealRef, DealStage target, LocalDate closeDate, String lostReason) {
        Deal deal = findVisible(dealRef);
        DealStage from = deal.getStage();
        DealStageRules.refusal(from, target).ifPresent(reason -> {
            throw ConflictException.stageTransition(
                    "Cannot move " + dealRef + " from " + from + " to " + target + ". " + reason);
        });

        // Closing a deal needs more than an open deal does.
        if (target == DealStage.WON && closeDate == null) {
            throw new FieldValidationException("closeDate", "closeDate is required when a deal is won");
        }
        if (target == DealStage.LOST && (lostReason == null || lostReason.isBlank())) {
            throw new FieldValidationException("lostReason", "lostReason is required when a deal is lost");
        }

        Instant now = Instant.now();
        deal.setStage(target);
        deal.setUpdatedAt(now);
        if (target == DealStage.WON) {
            deal.setClosedDate(closeDate);
            // Winning a deal makes the contact a paying customer. Losing one never undoes
            // that: a contact who is already a customer stays one.
            deal.getContact().setStatus(ContactStatus.CUSTOMER);
        } else if (target == DealStage.LOST) {
            deal.setClosedDate(closeDate != null ? closeDate : LocalDate.now(ZoneOffset.UTC));
            deal.setLostReason(lostReason.trim());
        }
        // One transaction for the deal, the history row and the contact: they succeed or
        // fail together.
        stageChanges.save(new DealStageChange(deal.getId(), from, target, now));
        audit.stageChanged(dealRef, from.name(), target.name());
        return deal;
    }

    @Transactional(readOnly = true)
    public DealSummary summarise() {
        Map<DealStage, StageTotal> totals = deals.totalsByStage(ownerScope()).stream()
                .collect(Collectors.toMap(StageTotal::stage, Function.identity()));
        List<StageTotal> stages = Arrays.stream(DealStage.values())
                .map(stage -> totals.getOrDefault(stage, new StageTotal(stage, 0, BigDecimal.ZERO)))
                .toList();
        return new DealSummary(stages);
    }

    @Transactional(readOnly = true)
    public List<DealStageChange> history(String dealRef) {
        Deal deal = findVisible(dealRef);
        List<DealStageChange> changes = stageChanges.findByDealIdOrderByChangedAtAscIdAsc(deal.getId());
        audit.listed("deal-history", changes.size());
        return changes;
    }

    private static void ensureNotInThePast(LocalDate expectedCloseDate) {
        if (expectedCloseDate.isBefore(LocalDate.now(ZoneOffset.UTC))) {
            throw new FieldValidationException("expectedCloseDate", "expectedCloseDate must not be in the past");
        }
    }
}
