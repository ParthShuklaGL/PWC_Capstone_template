using FluentValidation;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Common;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Application.Crm;

public sealed record AccountDto(long Id, string Name, string? Industry, string? Country, string? Website, DateTime CreatedAt, int ContactCount)
{
    public static AccountDto From(Account account, int contactCount) =>
        new(account.Id, account.Name, account.Industry, account.Country, account.Website, account.CreatedAt, contactCount);
}

/// <summary>The fields a caller may set. Shared by create and update so the rules cannot drift apart.</summary>
public sealed record AccountInput(string Name, string? Industry, string? Country, string? Website);

public sealed class AccountInputValidator : AbstractValidator<AccountInput>
{
    public AccountInputValidator()
    {
        RuleFor(input => input.Name).NotEmpty().MaximumLength(200);
        RuleFor(input => input.Industry).MaximumLength(80);
        RuleFor(input => input.Country).MaximumLength(80);
        RuleFor(input => input.Website).MaximumLength(200)
            .Must(url => url is null || (Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https"))
            .WithMessage("Website must be a full http or https address.");
    }
}

internal static class Text
{
    public static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

// ---- list ----

public sealed record ListAccountsQuery(int Page, int Size, string? Search) : IQuery<PagedResult<AccountDto>>;

public sealed class ListAccountsQueryValidator : AbstractValidator<ListAccountsQuery>
{
    public ListAccountsQueryValidator()
    {
        RuleFor(query => query.Page).ValidPage();
        RuleFor(query => query.Size).ValidSize();
        RuleFor(query => query.Search).MaximumLength(100);
    }
}

public sealed class ListAccountsQueryHandler(IApplicationDbContext db)
    : IQueryHandler<ListAccountsQuery, PagedResult<AccountDto>>
{
    public async ValueTask<PagedResult<AccountDto>> Handle(ListAccountsQuery query, CancellationToken cancellationToken)
    {
        var accounts = db.Accounts.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            accounts = accounts.Where(account => account.Name.Contains(term));
        }

        var total = await accounts.CountAsync(cancellationToken);
        var rows = await accounts
            .OrderBy(account => account.Name)
            .ThenBy(account => account.Id)
            .Skip(query.Page * query.Size)
            .Take(query.Size)
            .Select(account => new { Account = account, Contacts = account.Contacts.Count })
            .ToListAsync(cancellationToken);

        return new PagedResult<AccountDto>(
            rows.Select(row => AccountDto.From(row.Account, row.Contacts)).ToList(), query.Page, query.Size, total);
    }
}

// ---- get ----

public sealed record GetAccountQuery(long Id) : IQuery<Result<AccountDto>>;

public sealed class GetAccountQueryHandler(IApplicationDbContext db)
    : IQueryHandler<GetAccountQuery, Result<AccountDto>>
{
    public async ValueTask<Result<AccountDto>> Handle(GetAccountQuery query, CancellationToken cancellationToken)
    {
        var row = await db.Accounts
            .AsNoTracking()
            .Where(account => account.Id == query.Id)
            .Select(account => new { Account = account, Contacts = account.Contacts.Count })
            .FirstOrDefaultAsync(cancellationToken);

        return row is null ? CrmErrors.AccountNotFound : AccountDto.From(row.Account, row.Contacts);
    }
}

// ---- create ----

public sealed record CreateAccountCommand(AccountInput Input) : ICommand<Result<AccountDto>>;

public sealed class CreateAccountCommandValidator : AbstractValidator<CreateAccountCommand>
{
    public CreateAccountCommandValidator() => RuleFor(command => command.Input).SetValidator(new AccountInputValidator());
}

public sealed class CreateAccountCommandHandler(IApplicationDbContext db)
    : ICommandHandler<CreateAccountCommand, Result<AccountDto>>
{
    public async ValueTask<Result<AccountDto>> Handle(CreateAccountCommand command, CancellationToken cancellationToken)
    {
        var input = command.Input;
        var account = new Account
        {
            Name = input.Name.Trim(),
            Industry = Text.Clean(input.Industry),
            Country = Text.Clean(input.Country),
            Website = Text.Clean(input.Website),
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync(cancellationToken);
        return AccountDto.From(account, 0);
    }
}

// ---- update ----

public sealed record UpdateAccountCommand(long Id, AccountInput Input) : ICommand<Result<AccountDto>>;

public sealed class UpdateAccountCommandValidator : AbstractValidator<UpdateAccountCommand>
{
    public UpdateAccountCommandValidator() => RuleFor(command => command.Input).SetValidator(new AccountInputValidator());
}

public sealed class UpdateAccountCommandHandler(IApplicationDbContext db)
    : ICommandHandler<UpdateAccountCommand, Result<AccountDto>>
{
    public async ValueTask<Result<AccountDto>> Handle(UpdateAccountCommand command, CancellationToken cancellationToken)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(row => row.Id == command.Id, cancellationToken);
        if (account is null)
        {
            return CrmErrors.AccountNotFound;
        }

        var input = command.Input;
        account.Name = input.Name.Trim();
        account.Industry = Text.Clean(input.Industry);
        account.Country = Text.Clean(input.Country);
        account.Website = Text.Clean(input.Website);
        await db.SaveChangesAsync(cancellationToken);

        var contacts = await db.Contacts.CountAsync(contact => contact.AccountId == account.Id, cancellationToken);
        return AccountDto.From(account, contacts);
    }
}

// ---- delete ----

public sealed record DeleteAccountCommand(long Id) : ICommand<Result<bool>>;

public sealed class DeleteAccountCommandHandler(IApplicationDbContext db)
    : ICommandHandler<DeleteAccountCommand, Result<bool>>
{
    public async ValueTask<Result<bool>> Handle(DeleteAccountCommand command, CancellationToken cancellationToken)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(row => row.Id == command.Id, cancellationToken);
        if (account is null)
        {
            return CrmErrors.AccountNotFound;
        }

        // The foreign key would refuse anyway; asking first gives the caller a clear 409 instead of a database error.
        if (await db.Contacts.AnyAsync(contact => contact.AccountId == command.Id, cancellationToken))
        {
            return CrmErrors.AccountHasContacts;
        }

        db.Accounts.Remove(account);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
