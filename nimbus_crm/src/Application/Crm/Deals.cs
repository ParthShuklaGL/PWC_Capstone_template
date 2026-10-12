using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Common;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Application.Crm;

public sealed record DealDto(
    long Id,
    long ContactId,
    string ContactName,
    long AccountId,
    string AccountName,
    string Title,
    decimal Value,
    DateOnly ExpectedCloseDate,
    DealStage Stage,
    DateOnly? ClosedDate,
    string? LostReason,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static DealDto From(Deal deal, string contactName, long accountId, string accountName) => new(
        deal.Id, deal.ContactId, contactName, accountId, accountName, deal.Title, deal.Value, deal.ExpectedCloseDate,
        deal.Stage, deal.ClosedDate, deal.LostReason, deal.CreatedAt, deal.UpdatedAt);
}

/// <summary>
/// The fields a caller may set. ClosedDate is not one of them: the server sets it when a deal reaches
/// Won or Lost and clears it when the deal is reopened, so it can never disagree with the stage.
/// </summary>
public sealed record DealInput(
    long ContactId,
    string Title,
    decimal Value,
    DateOnly ExpectedCloseDate,
    DealStage Stage,
    string? LostReason);

public sealed class DealInputValidator : AbstractValidator<DealInput>
{
    /// <summary>The column is decimal(18,2); stay well inside it.</summary>
    private const decimal MaxValue = 1_000_000_000_000m;

    public DealInputValidator()
    {
        RuleFor(input => input.ContactId).GreaterThan(0);
        RuleFor(input => input.Title).NotEmpty().MaximumLength(200);
        RuleFor(input => input.Value).InclusiveBetween(0m, MaxValue).PrecisionScale(18, 2, false);
        RuleFor(input => input.Stage).IsInEnum();
        RuleFor(input => input.LostReason).MaximumLength(500);
        RuleFor(input => input.LostReason)
            .NotEmpty().When(input => input.Stage == DealStage.Lost)
            .WithMessage("Say why the deal was lost.");
    }
}

/// <summary>The one place the stage rules live, used by create and update.</summary>
internal static class DealRules
{
    public static void Apply(Deal deal, DealInput input, DateOnly today)
    {
        var wasClosed = deal.Stage is DealStage.Won or DealStage.Lost;
        var isClosed = input.Stage is DealStage.Won or DealStage.Lost;

        deal.ContactId = input.ContactId;
        deal.Title = input.Title.Trim();
        deal.Value = input.Value;
        deal.ExpectedCloseDate = input.ExpectedCloseDate;
        deal.Stage = input.Stage;
        deal.LostReason = input.Stage == DealStage.Lost ? Text.Clean(input.LostReason) : null;

        if (!isClosed)
        {
            deal.ClosedDate = null;
        }
        else if (!wasClosed || deal.ClosedDate is null)
        {
            deal.ClosedDate = today;
        }
    }
}

// ---- list ----

public sealed record ListDealsQuery(int Page, int Size, string? Search, DealStage? Stage, long? ContactId, long? AccountId)
    : IQuery<PagedResult<DealDto>>;

public sealed class ListDealsQueryValidator : AbstractValidator<ListDealsQuery>
{
    public ListDealsQueryValidator()
    {
        RuleFor(query => query.Page).ValidPage();
        RuleFor(query => query.Size).ValidSize();
        RuleFor(query => query.Search).MaximumLength(100);
        RuleFor(query => query.Stage).IsInEnum();
    }
}

public sealed class ListDealsQueryHandler(IApplicationDbContext db)
    : IQueryHandler<ListDealsQuery, PagedResult<DealDto>>
{
    public async ValueTask<PagedResult<DealDto>> Handle(ListDealsQuery query, CancellationToken cancellationToken)
    {
        var deals = db.Deals.AsNoTracking();
        if (query.Stage is { } stage)
        {
            deals = deals.Where(deal => deal.Stage == stage);
        }

        if (query.ContactId is { } contactId)
        {
            deals = deals.Where(deal => deal.ContactId == contactId);
        }

        if (query.AccountId is { } accountId)
        {
            deals = deals.Where(deal => deal.Contact!.AccountId == accountId);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            deals = deals.Where(deal => deal.Title.Contains(term));
        }

        var total = await deals.CountAsync(cancellationToken);
        var rows = await deals
            .OrderBy(deal => deal.ExpectedCloseDate)
            .ThenBy(deal => deal.Id)
            .Skip(query.Page * query.Size)
            .Take(query.Size)
            .Select(deal => new
            {
                Deal = deal,
                ContactFirst = deal.Contact!.FirstName,
                ContactLast = deal.Contact.LastName,
                AccountId = deal.Contact.AccountId,
                AccountName = deal.Contact.Account!.Name,
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<DealDto>(
            rows.Select(row => DealDto.From(row.Deal, $"{row.ContactFirst} {row.ContactLast}", row.AccountId, row.AccountName)).ToList(),
            query.Page, query.Size, total);
    }
}

// ---- get ----

public sealed record GetDealQuery(long Id) : IQuery<Result<DealDto>>;

public sealed class GetDealQueryHandler(IApplicationDbContext db)
    : IQueryHandler<GetDealQuery, Result<DealDto>>
{
    public async ValueTask<Result<DealDto>> Handle(GetDealQuery query, CancellationToken cancellationToken)
    {
        var row = await db.Deals
            .AsNoTracking()
            .Where(deal => deal.Id == query.Id)
            .Select(deal => new
            {
                Deal = deal,
                ContactFirst = deal.Contact!.FirstName,
                ContactLast = deal.Contact.LastName,
                AccountId = deal.Contact.AccountId,
                AccountName = deal.Contact.Account!.Name,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return row is null
            ? CrmErrors.DealNotFound
            : DealDto.From(row.Deal, $"{row.ContactFirst} {row.ContactLast}", row.AccountId, row.AccountName);
    }
}

// ---- create ----

public sealed record CreateDealCommand(DealInput Input) : ICommand<Result<DealDto>>;

public sealed class CreateDealCommandValidator : AbstractValidator<CreateDealCommand>
{
    public CreateDealCommandValidator() => RuleFor(command => command.Input).SetValidator(new DealInputValidator());
}

public sealed class CreateDealCommandHandler(IApplicationDbContext db, TimeProvider clock)
    : ICommandHandler<CreateDealCommand, Result<DealDto>>
{
    public async ValueTask<Result<DealDto>> Handle(CreateDealCommand command, CancellationToken cancellationToken)
    {
        var contact = await db.Contacts
            .AsNoTracking()
            .Where(row => row.Id == command.Input.ContactId)
            .Select(row => new { row.FirstName, row.LastName, row.AccountId, AccountName = row.Account!.Name })
            .FirstOrDefaultAsync(cancellationToken);
        if (contact is null)
        {
            return CrmErrors.ContactNotFound;
        }

        var now = clock.GetUtcNow().UtcDateTime;
        var deal = new Deal { ContactId = command.Input.ContactId, Title = command.Input.Title, CreatedAt = now, UpdatedAt = now };
        DealRules.Apply(deal, command.Input, DateOnly.FromDateTime(now));

        db.Deals.Add(deal);
        await db.SaveChangesAsync(cancellationToken);
        return DealDto.From(deal, $"{contact.FirstName} {contact.LastName}", contact.AccountId, contact.AccountName);
    }
}

// ---- update ----

public sealed record UpdateDealCommand(long Id, DealInput Input) : ICommand<Result<DealDto>>;

public sealed class UpdateDealCommandValidator : AbstractValidator<UpdateDealCommand>
{
    public UpdateDealCommandValidator() => RuleFor(command => command.Input).SetValidator(new DealInputValidator());
}

public sealed class UpdateDealCommandHandler(IApplicationDbContext db, TimeProvider clock)
    : ICommandHandler<UpdateDealCommand, Result<DealDto>>
{
    public async ValueTask<Result<DealDto>> Handle(UpdateDealCommand command, CancellationToken cancellationToken)
    {
        var deal = await db.Deals.FirstOrDefaultAsync(row => row.Id == command.Id, cancellationToken);
        if (deal is null)
        {
            return CrmErrors.DealNotFound;
        }

        var contact = await db.Contacts
            .AsNoTracking()
            .Where(row => row.Id == command.Input.ContactId)
            .Select(row => new { row.FirstName, row.LastName, row.AccountId, AccountName = row.Account!.Name })
            .FirstOrDefaultAsync(cancellationToken);
        if (contact is null)
        {
            return CrmErrors.ContactNotFound;
        }

        var now = clock.GetUtcNow().UtcDateTime;
        DealRules.Apply(deal, command.Input, DateOnly.FromDateTime(now));
        deal.UpdatedAt = now;

        await db.SaveChangesAsync(cancellationToken);
        return DealDto.From(deal, $"{contact.FirstName} {contact.LastName}", contact.AccountId, contact.AccountName);
    }
}

// ---- delete ----

public sealed record DeleteDealCommand(long Id) : ICommand<Result<bool>>;

public sealed class DeleteDealCommandHandler(IApplicationDbContext db)
    : ICommandHandler<DeleteDealCommand, Result<bool>>
{
    public async ValueTask<Result<bool>> Handle(DeleteDealCommand command, CancellationToken cancellationToken)
    {
        var deal = await db.Deals.FirstOrDefaultAsync(row => row.Id == command.Id, cancellationToken);
        if (deal is null)
        {
            return CrmErrors.DealNotFound;
        }

        db.Deals.Remove(deal);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
