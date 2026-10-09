using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using NimbusCrm.Application.Auth;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;
using NimbusCrm.Infrastructure.Persistence;
using NimbusCrm.Infrastructure.Security;
using NimbusCrm.IntegrationTests.Infrastructure;

namespace NimbusCrm.IntegrationTests.Auth;

/// <summary>Signed-out credentials and deactivated users, against a real MySQL database.</summary>
public class CredentialLifecycleTests(MySqlDatabaseFixture database) : IClassFixture<MySqlDatabaseFixture>
{
    private DatabaseTokenRevocationList NewRevocationList(TimeProvider? clock = null) =>
        new(TestHelpers.ScopeFactory(database), new MemoryCache(new MemoryCacheOptions()), clock ?? TimeProvider.System);

    private CredentialValidator NewValidator() =>
        new(TestHelpers.ScopeFactory(database), new MemoryCache(new MemoryCacheOptions()), NewRevocationList());

    [MySqlFact]
    public async Task ARevokedCredentialStaysRevokedAfterARestart()
    {
        var id = Guid.NewGuid().ToString("N");
        await NewRevocationList().RevokeAsync(id, DateTimeOffset.UtcNow.AddMinutes(30), CancellationToken.None);

        // A brand-new list with an empty cache stands in for the API after a restart, or a second instance.
        var afterRestart = NewRevocationList();

        Assert.True(await afterRestart.IsRevokedAsync(id, CancellationToken.None));
    }

    [MySqlFact]
    public async Task AnUnknownCredentialIsNotRevoked()
    {
        Assert.False(await NewRevocationList().IsRevokedAsync(Guid.NewGuid().ToString("N"), CancellationToken.None));
    }

    [MySqlFact]
    public async Task RevokingAnAlreadyExpiredCredentialStoresNothing()
    {
        var id = Guid.NewGuid().ToString("N");

        await NewRevocationList().RevokeAsync(id, DateTimeOffset.UtcNow.AddMinutes(-1), CancellationToken.None);

        await using var context = database.CreateContext();
        Assert.False(await context.RevokedTokens.AnyAsync(token => token.TokenId == id));
    }

    [MySqlFact]
    public async Task RevokingTheSameCredentialTwiceIsHarmless()
    {
        var id = Guid.NewGuid().ToString("N");
        var list = NewRevocationList();

        await list.RevokeAsync(id, DateTimeOffset.UtcNow.AddMinutes(30), CancellationToken.None);
        await list.RevokeAsync(id, DateTimeOffset.UtcNow.AddMinutes(30), CancellationToken.None);

        await using var context = database.CreateContext();
        Assert.Equal(1, await context.RevokedTokens.CountAsync(token => token.TokenId == id));
    }

    [MySqlFact]
    public async Task TheCleanerDeletesExpiredRowsAndKeepsLiveOnes()
    {
        var expired = "old" + Guid.NewGuid().ToString("N")[..10];
        var live = "new" + Guid.NewGuid().ToString("N")[..10];
        await using (var context = database.CreateContext())
        {
            context.RevokedTokens.AddRange(
                new RevokedToken { TokenId = expired, ExpiresAt = DateTime.UtcNow.AddHours(-2) },
                new RevokedToken { TokenId = live, ExpiresAt = DateTime.UtcNow.AddHours(2) });
            await context.SaveChangesAsync(CancellationToken.None);
        }

        var cleaner = new RevokedTokenCleaner(TestHelpers.ScopeFactory(database), TimeProvider.System, NullLogger<RevokedTokenCleaner>.Instance);
        var deleted = await cleaner.DeleteExpiredAsync(CancellationToken.None);

        await using var check = database.CreateContext();
        Assert.True(deleted >= 1);
        Assert.False(await check.RevokedTokens.AnyAsync(token => token.TokenId == expired));
        Assert.True(await check.RevokedTokens.AnyAsync(token => token.TokenId == live));
    }

    [MySqlFact]
    public async Task AnActiveUserWithTheSameRoleIsAccepted()
    {
        var user = await TestHelpers.AddUserAsync(database, "Password-for-test-1!");

        Assert.True(await NewValidator().IsValidAsync(user.Id, RoleNames.User, Guid.NewGuid().ToString("N"), CancellationToken.None));
    }

    [MySqlFact]
    public async Task ASignedOutCredentialIsRefusedEvenForAnActiveUser()
    {
        var user = await TestHelpers.AddUserAsync(database, "Password-for-test-1!");
        var tokenId = Guid.NewGuid().ToString("N");
        var revocations = NewRevocationList();
        await revocations.RevokeAsync(tokenId, DateTimeOffset.UtcNow.AddMinutes(30), CancellationToken.None);
        var validator = new CredentialValidator(TestHelpers.ScopeFactory(database), new MemoryCache(new MemoryCacheOptions()), revocations);

        Assert.False(await validator.IsValidAsync(user.Id, RoleNames.User, tokenId, CancellationToken.None));
    }

    [MySqlFact]
    public async Task ADeactivatedUserIsRefused()
    {
        var user = await TestHelpers.AddUserAsync(database, "Password-for-test-1!");
        await using (var context = database.CreateContext())
        {
            await context.Users.Where(candidate => candidate.Id == user.Id)
                .ExecuteUpdateAsync(set => set.SetProperty(candidate => candidate.IsActive, false), CancellationToken.None);
        }

        Assert.False(await NewValidator().IsValidAsync(user.Id, RoleNames.User, null, CancellationToken.None));
    }

    [MySqlFact]
    public async Task ACredentialIssuedForAnotherRoleIsRefused()
    {
        var user = await TestHelpers.AddUserAsync(database, "Password-for-test-1!", UserRole.User);

        // The credential claims ADMIN, but the user is a plain USER now (or always was).
        Assert.False(await NewValidator().IsValidAsync(user.Id, RoleNames.Admin, null, CancellationToken.None));
    }

    [MySqlFact]
    public async Task AUserWhoWasPromotedStopsMatchingTheirOldCredential()
    {
        var user = await TestHelpers.AddUserAsync(database, "Password-for-test-1!", UserRole.User);
        await using (var context = database.CreateContext())
        {
            await context.Users.Where(candidate => candidate.Id == user.Id)
                .ExecuteUpdateAsync(set => set.SetProperty(candidate => candidate.Role, UserRole.Admin), CancellationToken.None);
        }

        var validator = NewValidator();

        Assert.False(await validator.IsValidAsync(user.Id, RoleNames.User, null, CancellationToken.None));
        Assert.True(await validator.IsValidAsync(user.Id, RoleNames.Admin, null, CancellationToken.None));
    }

    [MySqlFact]
    public async Task AnUnknownUserIsRefused()
    {
        Assert.False(await NewValidator().IsValidAsync(long.MaxValue, RoleNames.User, null, CancellationToken.None));
    }

    [MySqlFact]
    public async Task ADeactivationIsNotSeenUntilTheCachedLookupExpires()
    {
        var user = await TestHelpers.AddUserAsync(database, "Password-for-test-1!");
        var validator = NewValidator();
        Assert.True(await validator.IsValidAsync(user.Id, RoleNames.User, null, CancellationToken.None));

        await using (var context = database.CreateContext())
        {
            await context.Users.Where(candidate => candidate.Id == user.Id)
                .ExecuteUpdateAsync(set => set.SetProperty(candidate => candidate.IsActive, false), CancellationToken.None);
        }

        // Documented trade-off: the user lookup is cached for CredentialValidator.UserCacheSeconds (30).
        Assert.True(await validator.IsValidAsync(user.Id, RoleNames.User, null, CancellationToken.None));
        Assert.False(await NewValidator().IsValidAsync(user.Id, RoleNames.User, null, CancellationToken.None));
    }

    [MySqlFact]
    public async Task TheDatabaseRefusesTwoUsersWithTheSameUsernameAndTheApiMapsThatTo409()
    {
        var first = await TestHelpers.AddUserAsync(database, "Password-for-test-1!");
        await using var context = database.CreateContext();
        context.Users.Add(new User { Username = first.Username, Email = "other-" + first.Email, PasswordHash = "x" });

        var failure = await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync(CancellationToken.None));

        Assert.True(DuplicateKey.Matches(failure));
        Assert.False(DuplicateKey.Matches(new InvalidOperationException("something else")));
    }
}
