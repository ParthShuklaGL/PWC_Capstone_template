using FluentValidation;
using NimbusCrm.Application.Common;
using NimbusCrm.Application.Crm;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;
using NimbusCrm.IntegrationTests.Infrastructure;

namespace NimbusCrm.IntegrationTests.Crm;

/// <summary>
/// The accounts, contacts and deals handlers against a real MySQL built by the real migrations.
/// Every test makes its own rows (with a fresh account as the filter) so tests never see each other's data.
/// </summary>
public sealed class CrmCrudTests(MySqlDatabaseFixture database) : IClassFixture<MySqlDatabaseFixture>
{
    private static readonly CancellationToken Ct = CancellationToken.None;
    private readonly ManualClock _clock = new(new DateTimeOffset(2026, 10, 12, 9, 0, 0, TimeSpan.Zero));

    // ---- helpers: each call gets a fresh context, as each request does ----

    private async Task<AccountDto> NewAccountAsync(string? name = null)
    {
        await using var db = database.CreateContext();
        var result = await new CreateAccountCommandHandler(db).Handle(
            new CreateAccountCommand(new AccountInput(name ?? "Acct " + Guid.NewGuid().ToString("N")[..8], null, null, null)), Ct);
        return result.Value;
    }

    private async Task<ContactDto> NewContactAsync(long accountId, string first = "Ann", string last = "Lee", ContactStatus status = ContactStatus.Prospect)
    {
        await using var db = database.CreateContext();
        var result = await new CreateContactCommandHandler(db).Handle(
            new CreateContactCommand(new ContactInput(accountId, first, last, $"{first}.{last}@example.com".ToLowerInvariant(), null, null, status)), Ct);
        return result.Value;
    }

    private async Task<Result<DealDto>> SaveDealAsync(long contactId, DealStage stage, string? lostReason = null, string title = "Renewal", long? updateId = null, decimal value = 1000m, DateOnly? close = null)
    {
        await using var db = database.CreateContext();
        var input = new DealInput(contactId, title, value, close ?? new DateOnly(2026, 12, 1), stage, lostReason);
        return updateId is { } id
            ? await new UpdateDealCommandHandler(db, _clock).Handle(new UpdateDealCommand(id, input), Ct)
            : await new CreateDealCommandHandler(db, _clock).Handle(new CreateDealCommand(input), Ct);
    }

    private async Task<Result<bool>> DeleteContactAsync(long id)
    {
        await using var db = database.CreateContext();
        return await new DeleteContactCommandHandler(db).Handle(new DeleteContactCommand(id), Ct);
    }

    // ---- accounts ----

    [MySqlFact]
    public async Task AnAccountCanBeCreatedReadUpdatedAndDeleted()
    {
        await using var db = database.CreateContext();
        var created = (await new CreateAccountCommandHandler(db).Handle(
            new CreateAccountCommand(new AccountInput("  Orbit Ltd  ", " Space ", "", "https://orbit.example")), Ct)).Value;

        Assert.Equal("Orbit Ltd", created.Name);
        Assert.Equal("Space", created.Industry);
        Assert.Null(created.Country);   // blank text is stored as "nothing", not as an empty string
        Assert.Equal(0, created.ContactCount);

        await using (var read = database.CreateContext())
        {
            var fetched = (await new GetAccountQueryHandler(read).Handle(new GetAccountQuery(created.Id), Ct)).Value;
            Assert.Equal("Orbit Ltd", fetched.Name);
            Assert.Equal("https://orbit.example", fetched.Website);
        }

        await using (var write = database.CreateContext())
        {
            var updated = (await new UpdateAccountCommandHandler(write).Handle(
                new UpdateAccountCommand(created.Id, new AccountInput("Orbit plc", null, "UK", null)), Ct)).Value;
            Assert.Equal("Orbit plc", updated.Name);
            Assert.Null(updated.Industry);
            Assert.Equal("UK", updated.Country);
        }

        await using (var remove = database.CreateContext())
        {
            Assert.True((await new DeleteAccountCommandHandler(remove).Handle(new DeleteAccountCommand(created.Id), Ct)).IsSuccess);
        }

        await using var after = database.CreateContext();
        var gone = await new GetAccountQueryHandler(after).Handle(new GetAccountQuery(created.Id), Ct);
        Assert.Equal(CrmErrors.AccountNotFound, gone.Error);
    }

    [Fact]
    public void AnAccountNeedsANameAndAWebAddressMustBeFull()
    {
        var validator = new AccountInputValidator();

        Assert.False(validator.Validate(new AccountInput("", null, null, null)).IsValid);
        Assert.False(validator.Validate(new AccountInput("Ok", null, null, "orbit.example")).IsValid);
        Assert.False(validator.Validate(new AccountInput("Ok", null, null, "javascript:alert(1)")).IsValid);
        Assert.False(validator.Validate(new AccountInput(new string('x', 201), null, null, null)).IsValid);
        Assert.True(validator.Validate(new AccountInput("Ok", null, null, "http://orbit.example")).IsValid);
    }

    [MySqlFact]
    public async Task MissingAccountsAreReportedAsNotFound()
    {
        await using var db = database.CreateContext();

        Assert.Equal(CrmErrors.AccountNotFound,
            (await new UpdateAccountCommandHandler(db).Handle(new UpdateAccountCommand(999_999, new AccountInput("X", null, null, null)), Ct)).Error);
        Assert.Equal(CrmErrors.AccountNotFound,
            (await new DeleteAccountCommandHandler(db).Handle(new DeleteAccountCommand(999_999), Ct)).Error);
    }

    [MySqlFact]
    public async Task AccountListsAreSearchableAndPagedWithATotal()
    {
        var tag = "Zz" + Guid.NewGuid().ToString("N")[..6];
        foreach (var letter in "ABCDE")
        {
            await NewAccountAsync($"{tag}-{letter}");
        }

        await using var db = database.CreateContext();
        var handler = new ListAccountsQueryHandler(db);

        var first = await handler.Handle(new ListAccountsQuery(0, 2, tag), Ct);
        var last = await handler.Handle(new ListAccountsQuery(2, 2, tag), Ct);

        Assert.Equal(5, first.Total);
        Assert.Equal([$"{tag}-A", $"{tag}-B"], first.Items.Select(item => item.Name));
        Assert.Equal([$"{tag}-E"], last.Items.Select(item => item.Name));   // the short final page
        Assert.Empty((await handler.Handle(new ListAccountsQuery(0, 5, tag + "-nope"), Ct)).Items);
    }

    [MySqlFact]
    public async Task AnAccountWithContactsCannotBeDeletedUntilTheyAreGone()
    {
        var account = await NewAccountAsync();
        var contact = await NewContactAsync(account.Id);

        await using (var first = database.CreateContext())
        {
            var blocked = await new DeleteAccountCommandHandler(first).Handle(new DeleteAccountCommand(account.Id), Ct);
            Assert.Equal(CrmErrors.AccountHasContacts, blocked.Error);
        }

        Assert.True((await DeleteContactAsync(contact.Id)).IsSuccess);

        await using var second = database.CreateContext();
        Assert.True((await new DeleteAccountCommandHandler(second).Handle(new DeleteAccountCommand(account.Id), Ct)).IsSuccess);
    }

    // ---- contacts ----

    [MySqlFact]
    public async Task AContactMustBelongToAnAccountThatExists()
    {
        await using var db = database.CreateContext();
        var result = await new CreateContactCommandHandler(db).Handle(
            new CreateContactCommand(new ContactInput(999_999, "Ann", "Lee", "ann@example.com", null, null, ContactStatus.Prospect)), Ct);

        Assert.Equal(CrmErrors.AccountNotFound, result.Error);
    }

    [MySqlFact]
    public async Task AContactShowsItsAccountNameAndCanMoveToAnotherAccount()
    {
        var from = await NewAccountAsync("From Co " + Guid.NewGuid().ToString("N")[..6]);
        var to = await NewAccountAsync("To Co " + Guid.NewGuid().ToString("N")[..6]);
        var contact = await NewContactAsync(from.Id, "Mia", "Park", ContactStatus.Customer);
        Assert.Equal(from.Name, contact.AccountName);

        await using var db = database.CreateContext();
        var moved = (await new UpdateContactCommandHandler(db).Handle(
            new UpdateContactCommand(contact.Id, new ContactInput(to.Id, "Mia", "Park-Smith", "mia@example.com", "01234", "CTO", ContactStatus.Churned)), Ct)).Value;

        Assert.Equal(to.Id, moved.AccountId);
        Assert.Equal(to.Name, moved.AccountName);
        Assert.Equal("Park-Smith", moved.LastName);
        Assert.Equal(ContactStatus.Churned, moved.Status);

        await using var check = database.CreateContext();
        Assert.Equal(1, (await new GetAccountQueryHandler(check).Handle(new GetAccountQuery(to.Id), Ct)).Value.ContactCount);
        Assert.Equal(0, (await new GetAccountQueryHandler(check).Handle(new GetAccountQuery(from.Id), Ct)).Value.ContactCount);
    }

    [Fact]
    public void AContactNeedsNamesAValidEmailAndAnAccount()
    {
        var validator = new ContactInputValidator();
        var good = new ContactInput(1, "Ann", "Lee", "ann@example.com", null, null, ContactStatus.Prospect);

        Assert.True(validator.Validate(good).IsValid);
        Assert.False(validator.Validate(good with { AccountId = 0 }).IsValid);
        Assert.False(validator.Validate(good with { FirstName = " " }).IsValid);
        Assert.False(validator.Validate(good with { Email = "not-an-email" }).IsValid);
        Assert.False(validator.Validate(good with { Status = (ContactStatus)99 }).IsValid);
    }

    [MySqlFact]
    public async Task ContactListsFilterByAccountStatusAndSearchAndSortBySurname()
    {
        var account = await NewAccountAsync();
        await NewContactAsync(account.Id, "Zed", "Adams", ContactStatus.Customer);
        await NewContactAsync(account.Id, "Amy", "Brown", ContactStatus.Prospect);
        await NewContactAsync(account.Id, "Bea", "Clark", ContactStatus.Customer);
        await NewContactAsync((await NewAccountAsync()).Id, "Other", "Person");   // another account: must not appear

        await using var db = database.CreateContext();
        var handler = new ListContactsQueryHandler(db);

        var all = await handler.Handle(new ListContactsQuery(0, 10, null, account.Id, null), Ct);
        Assert.Equal(3, all.Total);
        Assert.Equal(["Adams", "Brown", "Clark"], all.Items.Select(item => item.LastName));

        var customers = await handler.Handle(new ListContactsQuery(0, 10, null, account.Id, ContactStatus.Customer), Ct);
        Assert.Equal(["Adams", "Clark"], customers.Items.Select(item => item.LastName));

        var search = await handler.Handle(new ListContactsQuery(0, 10, "bro", account.Id, null), Ct);
        Assert.Equal(["Brown"], search.Items.Select(item => item.LastName));
    }

    [MySqlFact]
    public async Task AContactWithDealsOrActivitiesCannotBeDeleted()
    {
        var account = await NewAccountAsync();
        var withDeal = await NewContactAsync(account.Id, "Has", "Deal");
        var withActivity = await NewContactAsync(account.Id, "Has", "Activity");
        var clean = await NewContactAsync(account.Id, "Has", "Nothing");

        await SaveDealAsync(withDeal.Id, DealStage.Prospecting);
        await using (var seed = database.CreateContext())
        {
            var user = new User { Username = "u" + Guid.NewGuid().ToString("N")[..10], Email = Guid.NewGuid().ToString("N")[..10] + "@example.com", PasswordHash = "x" };
            seed.Activities.Add(new Activity { ContactId = withActivity.Id, User = user, Type = ActivityType.Call, Subject = "Hello", OccurredAt = DateTime.UtcNow });
            await seed.SaveChangesAsync(Ct);
        }

        Assert.Equal(CrmErrors.ContactHasHistory, (await DeleteContactAsync(withDeal.Id)).Error);
        Assert.Equal(CrmErrors.ContactHasHistory, (await DeleteContactAsync(withActivity.Id)).Error);
        Assert.True((await DeleteContactAsync(clean.Id)).IsSuccess);
    }

    // ---- deals ----

    [MySqlFact]
    public async Task ADealBelongsToAContactThatExists()
    {
        var result = await SaveDealAsync(999_999, DealStage.Prospecting);

        Assert.Equal(CrmErrors.ContactNotFound, result.Error);
    }

    [MySqlFact]
    public async Task ADealShowsItsContactAndAccount()
    {
        var account = await NewAccountAsync();
        var contact = await NewContactAsync(account.Id, "Ivy", "Stone");

        var deal = (await SaveDealAsync(contact.Id, DealStage.Qualified, value: 1234.56m)).Value;

        Assert.Equal("Ivy Stone", deal.ContactName);
        Assert.Equal(account.Id, deal.AccountId);
        Assert.Equal(account.Name, deal.AccountName);
        Assert.Equal(1234.56m, deal.Value);
        Assert.Null(deal.ClosedDate);   // still open
    }

    [MySqlFact]
    public async Task ClosingADealStampsTodayAndReopeningClearsTheCloseDateAndReason()
    {
        var contact = await NewContactAsync((await NewAccountAsync()).Id);
        var open = (await SaveDealAsync(contact.Id, DealStage.Negotiation)).Value;

        var lost = (await SaveDealAsync(contact.Id, DealStage.Lost, "Went with a rival", updateId: open.Id)).Value;
        Assert.Equal(new DateOnly(2026, 10, 12), lost.ClosedDate);
        Assert.Equal("Went with a rival", lost.LostReason);

        var reopened = (await SaveDealAsync(contact.Id, DealStage.Negotiation, "ignored", updateId: open.Id)).Value;
        Assert.Null(reopened.ClosedDate);
        Assert.Null(reopened.LostReason);   // a reason only makes sense on a lost deal

        var won = (await SaveDealAsync(contact.Id, DealStage.Won, updateId: open.Id)).Value;
        Assert.Equal(new DateOnly(2026, 10, 12), won.ClosedDate);
        Assert.Null(won.LostReason);
    }

    [MySqlFact]
    public async Task EditingAClosedDealKeepsTheOriginalCloseDateAndMovesUpdatedAt()
    {
        var contact = await NewContactAsync((await NewAccountAsync()).Id);
        var won = (await SaveDealAsync(contact.Id, DealStage.Won)).Value;

        _clock.Advance(TimeSpan.FromDays(3));
        var edited = (await SaveDealAsync(contact.Id, DealStage.Won, title: "Renewal (final)", updateId: won.Id)).Value;

        Assert.Equal(won.ClosedDate, edited.ClosedDate);   // not re-stamped to the later day
        Assert.Equal("Renewal (final)", edited.Title);
        Assert.True(edited.UpdatedAt > won.UpdatedAt);
        Assert.Equal(won.CreatedAt, edited.CreatedAt);
    }

    [Fact]
    public void ALostDealMustSayWhyAndAValueMustBeSensible()
    {
        var validator = new DealInputValidator();
        var good = new DealInput(1, "Renewal", 100m, new DateOnly(2026, 12, 1), DealStage.Qualified, null);

        Assert.True(validator.Validate(good).IsValid);
        Assert.False(validator.Validate(good with { Stage = DealStage.Lost }).IsValid);
        Assert.False(validator.Validate(good with { Stage = DealStage.Lost, LostReason = "  " }).IsValid);
        Assert.True(validator.Validate(good with { Stage = DealStage.Lost, LostReason = "Budget" }).IsValid);
        Assert.False(validator.Validate(good with { Value = -1m }).IsValid);
        Assert.False(validator.Validate(good with { Value = 10.005m }).IsValid);   // more than two decimals
        Assert.False(validator.Validate(good with { Title = "" }).IsValid);
        Assert.False(validator.Validate(good with { Stage = (DealStage)99 }).IsValid);
    }

    [MySqlFact]
    public async Task DealListsFilterByStageAndAccountAndSortByCloseDate()
    {
        var account = await NewAccountAsync();
        var contact = await NewContactAsync(account.Id);
        var other = await NewContactAsync((await NewAccountAsync()).Id);

        await SaveDealAsync(contact.Id, DealStage.Proposal, title: "Late", close: new DateOnly(2027, 3, 1));
        await SaveDealAsync(contact.Id, DealStage.Proposal, title: "Early", close: new DateOnly(2026, 11, 1));
        await SaveDealAsync(contact.Id, DealStage.Won, title: "Done", close: new DateOnly(2026, 9, 1));
        await SaveDealAsync(other.Id, DealStage.Proposal, title: "Elsewhere");

        await using var db = database.CreateContext();
        var handler = new ListDealsQueryHandler(db);

        var all = await handler.Handle(new ListDealsQuery(0, 10, null, null, null, account.Id), Ct);
        Assert.Equal(3, all.Total);
        Assert.Equal(["Done", "Early", "Late"], all.Items.Select(item => item.Title));

        var proposals = await handler.Handle(new ListDealsQuery(0, 10, null, DealStage.Proposal, null, account.Id), Ct);
        Assert.Equal(["Early", "Late"], proposals.Items.Select(item => item.Title));

        var byContact = await handler.Handle(new ListDealsQuery(0, 10, "Else", null, other.Id, null), Ct);
        Assert.Equal(["Elsewhere"], byContact.Items.Select(item => item.Title));
    }

    [MySqlFact]
    public async Task ADealCanBeDeletedAndThenIsGone()
    {
        var contact = await NewContactAsync((await NewAccountAsync()).Id);
        var deal = (await SaveDealAsync(contact.Id, DealStage.Prospecting)).Value;

        await using (var remove = database.CreateContext())
        {
            Assert.True((await new DeleteDealCommandHandler(remove).Handle(new DeleteDealCommand(deal.Id), Ct)).IsSuccess);
        }

        await using var read = database.CreateContext();
        Assert.Equal(CrmErrors.DealNotFound, (await new GetDealQueryHandler(read).Handle(new GetDealQuery(deal.Id), Ct)).Error);
        Assert.Equal(CrmErrors.DealNotFound, (await new DeleteDealCommandHandler(read).Handle(new DeleteDealCommand(deal.Id), Ct)).Error);
    }

    [Fact]
    public void PagingRejectsNegativePagesAndOversizedPages()
    {
        Assert.False(new ListDealsQueryValidator().Validate(new ListDealsQuery(-1, 10, null, null, null, null)).IsValid);
        Assert.False(new ListDealsQueryValidator().Validate(new ListDealsQuery(0, 0, null, null, null, null)).IsValid);
        Assert.False(new ListDealsQueryValidator().Validate(new ListDealsQuery(0, 101, null, null, null, null)).IsValid);
        Assert.False(new ListDealsQueryValidator().Validate(new ListDealsQuery(10_001, 10, null, null, null, null)).IsValid);
        Assert.True(new ListDealsQueryValidator().Validate(new ListDealsQuery(10_000, 100, null, null, null, null)).IsValid);
    }
}
