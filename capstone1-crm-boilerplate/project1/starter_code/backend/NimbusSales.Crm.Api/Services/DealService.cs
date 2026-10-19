using NimbusSales.Crm.Auditing;
using NimbusSales.Crm.Domain;
using NimbusSales.Crm.Repositories;

namespace NimbusSales.Crm.Services;

public class DealService : IDealService
{
    private readonly IDealRepository _deals;
    private readonly IContactRepository _contacts;
    private readonly IAccountRepository _accounts;
    private readonly CrmAuditLogger _audit;

    public DealService(IDealRepository deals,
                       IContactRepository contacts,
                       IAccountRepository accounts,
                       CrmAuditLogger audit)
    {
        _deals = deals;
        _contacts = contacts;
        _accounts = accounts;
        _audit = audit;
    }

    public async Task<PagedResult<Deal>> ListAsync(int page, int size, DealStage? stage,
                                                   CancellationToken ct = default)
    {
        var found = await _deals.ListAsync(page, size, stage, ct);
        _audit.Listed("deal", found.Items.Count);
        return found;
    }

    public async Task<Deal> GetByRefAsync(string dealRef, CancellationToken ct = default)
    {
        var deal = await _deals.FindByRefAsync(dealRef, ct)
            ?? throw new DealNotFoundException(dealRef);
        _audit.Viewed("deal", dealRef);
        return deal;
    }

    public async Task<IReadOnlyList<Deal>> ListForContactAsync(
        string contactRef, CancellationToken ct = default)
    {
        var contact = await _contacts.FindByRefAsync(contactRef, ct)
            ?? throw new ContactNotFoundException(contactRef);

        var deals = await _deals.ListByContactAsync(contact.Id, ct);
        _audit.Listed("deal", deals.Count);
        return deals;
    }

    public async Task<Deal> CreateAsync(string title, string accountRef, string contactRef,
                                        decimal value, DateOnly expectedCloseDate,
                                        CancellationToken ct = default)
    {
        var account = await _accounts.FindByRefAsync(accountRef, ct)
            ?? throw new AccountNotFoundException(accountRef);
        var contact = await _contacts.FindByRefAsync(contactRef, ct)
            ?? throw new ContactNotFoundException(contactRef);

        if (contact.AccountId != account.Id)
        {
            throw new DealValidationException("contactRef",
                $"contact {contactRef} does not work at account {accountRef}");
        }

        EnsureNotInThePast(expectedCloseDate);

        var dealRef = await _deals.NextRefAsync(ct);
        var deal = new Deal(dealRef, account.Id, contact.Id, title, value, expectedCloseDate);
        await _deals.AddAsync(deal, ct);
        await _deals.SaveChangesAsync(ct);

        await _deals.AddStageChangeAsync(
            new DealStageChange(deal.Id, null, DealStage.Prospecting, deal.CreatedAt), ct);
        await _deals.SaveChangesAsync(ct);

        _audit.Created("deal", dealRef);

        // Reload so the account and contact are on the returned deal for the mapper.
        return await _deals.FindByRefAsync(dealRef, ct)
            ?? throw new DealNotFoundException(dealRef);
    }

    public async Task<Deal> UpdateAsync(string dealRef, string title, decimal value,
                                        DateOnly expectedCloseDate, CancellationToken ct = default)
    {
        var deal = await _deals.FindByRefAsync(dealRef, ct)
            ?? throw new DealNotFoundException(dealRef);

        if (DealStageRules.IsFinal(deal.Stage))
        {
            throw new DealClosedException(dealRef);
        }

        if (expectedCloseDate != deal.ExpectedCloseDate)
        {
            EnsureNotInThePast(expectedCloseDate);
        }

        deal.Title = title;
        deal.Value = value;
        deal.ExpectedCloseDate = expectedCloseDate;
        deal.UpdatedAt = DateTimeOffset.UtcNow;

        await _deals.SaveChangesAsync(ct);
        _audit.Updated("deal", dealRef);
        return deal;
    }

    public async Task DeleteAsync(string dealRef, CancellationToken ct = default)
    {
        var deal = await _deals.FindByRefAsync(dealRef, ct)
            ?? throw new DealNotFoundException(dealRef);

        if (deal.Stage != DealStage.Prospecting)
        {
            throw new DealDeleteNotAllowedException(dealRef, DealStageRules.Wire(deal.Stage));
        }

        _deals.Remove(deal);
        await _deals.SaveChangesAsync(ct);
        _audit.Deleted("deal", dealRef);
    }

    public async Task<Deal> MoveToStageAsync(string dealRef, DealStage target,
                                             DateOnly? closeDate, string? lostReason,
                                             CancellationToken ct = default)
    {
        var deal = await _deals.FindByRefAsync(dealRef, ct)
            ?? throw new DealNotFoundException(dealRef);

        var refusal = DealStageRules.Refusal(deal.Stage, target);
        if (refusal is not null)
        {
            throw new DealStageTransitionException(
                $"Cannot move {dealRef} from {DealStageRules.Wire(deal.Stage)} to " +
                $"{DealStageRules.Wire(target)}. {refusal}");
        }

        // Closing a deal needs more than an open deal does.
        if (target == DealStage.Won && closeDate is null)
        {
            throw new DealValidationException("closeDate",
                "closeDate is required when a deal is won");
        }

        if (target == DealStage.Lost && string.IsNullOrWhiteSpace(lostReason))
        {
            throw new DealValidationException("lostReason",
                "lostReason is required when a deal is lost");
        }

        var from = deal.Stage;
        var now = DateTimeOffset.UtcNow;

        deal.Stage = target;
        deal.UpdatedAt = now;

        if (target == DealStage.Won)
        {
            deal.ClosedDate = closeDate;

            // Winning a deal makes the contact a paying customer. Losing one never undoes
            // that: a contact who is already a customer stays one.
            if (deal.Contact is not null)
            {
                deal.Contact.Status = ContactStatus.Customer;
            }
        }
        else if (target == DealStage.Lost)
        {
            deal.ClosedDate = closeDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            deal.LostReason = lostReason!.Trim();
        }

        await _deals.AddStageChangeAsync(new DealStageChange(deal.Id, from, target, now), ct);

        // One SaveChanges for the deal, the history row and the contact: they succeed or
        // fail together.
        await _deals.SaveChangesAsync(ct);

        _audit.StageChanged(dealRef, DealStageRules.Wire(from), DealStageRules.Wire(target));
        return deal;
    }

    public async Task<DealSummary> SummariseAsync(CancellationToken ct = default)
    {
        var totals = await _deals.TotalsByStageAsync(ct);

        var stages = Enum.GetValues<DealStage>()
            .Select(stage => totals.FirstOrDefault(t => t.Stage == stage)
                             ?? new DealStageTotal(stage, 0, 0m))
            .ToList();

        return new DealSummary(stages);
    }

    public async Task<IReadOnlyList<DealStageChange>> HistoryAsync(
        string dealRef, CancellationToken ct = default)
    {
        var deal = await _deals.FindByRefAsync(dealRef, ct)
            ?? throw new DealNotFoundException(dealRef);

        var changes = await _deals.ListStageChangesAsync(deal.Id, ct);
        _audit.Listed("deal-history", changes.Count);
        return changes;
    }

    private static void EnsureNotInThePast(DateOnly expectedCloseDate)
    {
        if (expectedCloseDate < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            throw new DealValidationException("expectedCloseDate",
                "expectedCloseDate must not be in the past");
        }
    }
}
