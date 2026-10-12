using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Common;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Application.Crm;

public sealed record ContactDto(
    long Id,
    long AccountId,
    string AccountName,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? JobTitle,
    ContactStatus Status,
    DateTime? LastContactedAt,
    DateTime CreatedAt)
{
    public static ContactDto From(Contact contact, string accountName) => new(
        contact.Id, contact.AccountId, accountName, contact.FirstName, contact.LastName, contact.Email,
        contact.Phone, contact.JobTitle, contact.Status, contact.LastContactedAt, contact.CreatedAt);
}

public sealed record ContactInput(
    long AccountId,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string? JobTitle,
    ContactStatus Status);

public sealed class ContactInputValidator : AbstractValidator<ContactInput>
{
    public ContactInputValidator()
    {
        RuleFor(input => input.AccountId).GreaterThan(0);
        RuleFor(input => input.FirstName).NotEmpty().MaximumLength(80);
        RuleFor(input => input.LastName).NotEmpty().MaximumLength(80);
        RuleFor(input => input.Email).NotEmpty().MaximumLength(160).EmailAddress();
        RuleFor(input => input.Phone).MaximumLength(40);
        RuleFor(input => input.JobTitle).MaximumLength(120);
        RuleFor(input => input.Status).IsInEnum();
    }
}

// ---- list ----

public sealed record ListContactsQuery(int Page, int Size, string? Search, long? AccountId, ContactStatus? Status)
    : IQuery<PagedResult<ContactDto>>;

public sealed class ListContactsQueryValidator : AbstractValidator<ListContactsQuery>
{
    public ListContactsQueryValidator()
    {
        RuleFor(query => query.Page).ValidPage();
        RuleFor(query => query.Size).ValidSize();
        RuleFor(query => query.Search).MaximumLength(100);
        RuleFor(query => query.Status).IsInEnum();
    }
}

public sealed class ListContactsQueryHandler(IApplicationDbContext db)
    : IQueryHandler<ListContactsQuery, PagedResult<ContactDto>>
{
    public async ValueTask<PagedResult<ContactDto>> Handle(ListContactsQuery query, CancellationToken cancellationToken)
    {
        var contacts = db.Contacts.AsNoTracking();
        if (query.AccountId is { } accountId)
        {
            contacts = contacts.Where(contact => contact.AccountId == accountId);
        }

        if (query.Status is { } status)
        {
            contacts = contacts.Where(contact => contact.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            contacts = contacts.Where(contact =>
                contact.FirstName.Contains(term) || contact.LastName.Contains(term) || contact.Email.Contains(term));
        }

        var total = await contacts.CountAsync(cancellationToken);
        var rows = await contacts
            .OrderBy(contact => contact.LastName)
            .ThenBy(contact => contact.FirstName)
            .ThenBy(contact => contact.Id)
            .Skip(query.Page * query.Size)
            .Take(query.Size)
            .Select(contact => new { Contact = contact, AccountName = contact.Account!.Name })
            .ToListAsync(cancellationToken);

        return new PagedResult<ContactDto>(
            rows.Select(row => ContactDto.From(row.Contact, row.AccountName)).ToList(), query.Page, query.Size, total);
    }
}

// ---- get ----

public sealed record GetContactQuery(long Id) : IQuery<Result<ContactDto>>;

public sealed class GetContactQueryHandler(IApplicationDbContext db)
    : IQueryHandler<GetContactQuery, Result<ContactDto>>
{
    public async ValueTask<Result<ContactDto>> Handle(GetContactQuery query, CancellationToken cancellationToken)
    {
        var row = await db.Contacts
            .AsNoTracking()
            .Where(contact => contact.Id == query.Id)
            .Select(contact => new { Contact = contact, AccountName = contact.Account!.Name })
            .FirstOrDefaultAsync(cancellationToken);

        return row is null ? CrmErrors.ContactNotFound : ContactDto.From(row.Contact, row.AccountName);
    }
}

// ---- create ----

public sealed record CreateContactCommand(ContactInput Input) : ICommand<Result<ContactDto>>;

public sealed class CreateContactCommandValidator : AbstractValidator<CreateContactCommand>
{
    public CreateContactCommandValidator() => RuleFor(command => command.Input).SetValidator(new ContactInputValidator());
}

public sealed class CreateContactCommandHandler(IApplicationDbContext db)
    : ICommandHandler<CreateContactCommand, Result<ContactDto>>
{
    public async ValueTask<Result<ContactDto>> Handle(CreateContactCommand command, CancellationToken cancellationToken)
    {
        var input = command.Input;
        var accountName = await db.Accounts
            .Where(account => account.Id == input.AccountId)
            .Select(account => account.Name)
            .FirstOrDefaultAsync(cancellationToken);
        if (accountName is null)
        {
            return CrmErrors.AccountNotFound;
        }

        var contact = new Contact
        {
            AccountId = input.AccountId,
            FirstName = input.FirstName.Trim(),
            LastName = input.LastName.Trim(),
            Email = input.Email.Trim(),
            Phone = Text.Clean(input.Phone),
            JobTitle = Text.Clean(input.JobTitle),
            Status = input.Status,
        };

        db.Contacts.Add(contact);
        await db.SaveChangesAsync(cancellationToken);
        return ContactDto.From(contact, accountName);
    }
}

// ---- update ----

public sealed record UpdateContactCommand(long Id, ContactInput Input) : ICommand<Result<ContactDto>>;

public sealed class UpdateContactCommandValidator : AbstractValidator<UpdateContactCommand>
{
    public UpdateContactCommandValidator() => RuleFor(command => command.Input).SetValidator(new ContactInputValidator());
}

public sealed class UpdateContactCommandHandler(IApplicationDbContext db)
    : ICommandHandler<UpdateContactCommand, Result<ContactDto>>
{
    public async ValueTask<Result<ContactDto>> Handle(UpdateContactCommand command, CancellationToken cancellationToken)
    {
        var contact = await db.Contacts.FirstOrDefaultAsync(row => row.Id == command.Id, cancellationToken);
        if (contact is null)
        {
            return CrmErrors.ContactNotFound;
        }

        var input = command.Input;
        var accountName = await db.Accounts
            .Where(account => account.Id == input.AccountId)
            .Select(account => account.Name)
            .FirstOrDefaultAsync(cancellationToken);
        if (accountName is null)
        {
            return CrmErrors.AccountNotFound;
        }

        contact.AccountId = input.AccountId;
        contact.FirstName = input.FirstName.Trim();
        contact.LastName = input.LastName.Trim();
        contact.Email = input.Email.Trim();
        contact.Phone = Text.Clean(input.Phone);
        contact.JobTitle = Text.Clean(input.JobTitle);
        contact.Status = input.Status;
        await db.SaveChangesAsync(cancellationToken);

        return ContactDto.From(contact, accountName);
    }
}

// ---- delete ----

public sealed record DeleteContactCommand(long Id) : ICommand<Result<bool>>;

public sealed class DeleteContactCommandHandler(IApplicationDbContext db)
    : ICommandHandler<DeleteContactCommand, Result<bool>>
{
    public async ValueTask<Result<bool>> Handle(DeleteContactCommand command, CancellationToken cancellationToken)
    {
        var contact = await db.Contacts.FirstOrDefaultAsync(row => row.Id == command.Id, cancellationToken);
        if (contact is null)
        {
            return CrmErrors.ContactNotFound;
        }

        var hasHistory =
            await db.Deals.AnyAsync(deal => deal.ContactId == command.Id, cancellationToken)
            || await db.Activities.AnyAsync(activity => activity.ContactId == command.Id, cancellationToken);
        if (hasHistory)
        {
            return CrmErrors.ContactHasHistory;
        }

        db.Contacts.Remove(contact);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
