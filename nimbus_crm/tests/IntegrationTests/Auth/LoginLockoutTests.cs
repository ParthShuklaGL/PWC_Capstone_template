using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Application.Auth;
using NimbusCrm.Application.Auth.Login;
using NimbusCrm.Infrastructure.Security;
using NimbusCrm.IntegrationTests.Infrastructure;

namespace NimbusCrm.IntegrationTests.Auth;

/// <summary>The real login handler against a real database: lockout, counters, deactivation and hash upgrade.</summary>
public class LoginLockoutTests(MySqlDatabaseFixture database) : IClassFixture<MySqlDatabaseFixture>
{
    private const string Password = "Right-Password-2026!";
    private static readonly LockoutPolicy Policy = new(MaxFailedAttempts: 5, Duration: TimeSpan.FromMinutes(15));

    private readonly ManualClock _clock = new(new DateTimeOffset(2026, 10, 8, 12, 0, 0, TimeSpan.Zero));

    private async Task<(Application.Common.Result<UserDto> Result, Domain.Entities.User After)> LoginAsync(
        string username, string password, IPasswordHasher? hasher = null)
    {
        await using var context = database.CreateContext();
        var result = await new LoginCommandHandler(context, hasher ?? new IdentityPasswordHasher(), Policy, _clock)
            .Handle(new LoginCommand(username, password), CancellationToken.None);

        await using var check = database.CreateContext();
        var after = await check.Users.AsNoTracking().FirstOrDefaultAsync(user => user.Username == username)
            ?? new Domain.Entities.User { Username = username, Email = string.Empty, PasswordHash = string.Empty };
        return (result, after);
    }

    [MySqlFact]
    public async Task TheRightPasswordSignsIn()
    {
        var user = await TestHelpers.AddUserAsync(database, Password);

        var (result, _) = await LoginAsync(user.Username, Password);

        Assert.True(result.IsSuccess);
        Assert.Equal(user.Username, result.Value.Username);
        Assert.Equal("USER", result.Value.Role);
    }

    [MySqlFact]
    public async Task AWrongPasswordIsCountedAndAnswersWithTheGenericError()
    {
        var user = await TestHelpers.AddUserAsync(database, Password);

        var (result, after) = await LoginAsync(user.Username, "wrong-password-1");

        Assert.False(result.IsSuccess);
        Assert.Equal(AuthErrors.InvalidCredentials, result.Error);
        Assert.Equal(1, after.FailedLoginAttempts);
        Assert.Null(after.LockoutEndsAt);
    }

    [MySqlFact]
    public async Task AnUnknownUserGetsExactlyTheSameError()
    {
        var (result, _) = await LoginAsync("nobody-" + Guid.NewGuid().ToString("N")[..8], "whatever-password");

        Assert.Equal(AuthErrors.InvalidCredentials, result.Error);
    }

    [MySqlFact]
    public async Task TheFifthWrongPasswordLocksTheAccountEvenAgainstTheRightPassword()
    {
        var user = await TestHelpers.AddUserAsync(database, Password);
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await LoginAsync(user.Username, "wrong-password-" + attempt);
        }

        var (result, after) = await LoginAsync(user.Username, Password);

        Assert.False(result.IsSuccess);
        Assert.Equal(AuthErrors.InvalidCredentials, result.Error);
        Assert.Equal(_clock.GetUtcNow().UtcDateTime.AddMinutes(15), after.LockoutEndsAt);
        Assert.Equal(0, after.FailedLoginAttempts);
    }

    [MySqlFact]
    public async Task TheAccountOpensAgainWhenTheLockoutEndsAndTheRecordIsCleared()
    {
        var user = await TestHelpers.AddUserAsync(database, Password);
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await LoginAsync(user.Username, "wrong-password-" + attempt);
        }

        _clock.Advance(TimeSpan.FromMinutes(14));
        Assert.False((await LoginAsync(user.Username, Password)).Result.IsSuccess);

        _clock.Advance(TimeSpan.FromMinutes(2));
        var (result, after) = await LoginAsync(user.Username, Password);

        Assert.True(result.IsSuccess);
        Assert.Null(after.LockoutEndsAt);
        Assert.Equal(0, after.FailedLoginAttempts);
    }

    [MySqlFact]
    public async Task AGoodSignInResetsTheCountOfWrongPasswords()
    {
        var user = await TestHelpers.AddUserAsync(database, Password);
        await LoginAsync(user.Username, "wrong-password-1");
        await LoginAsync(user.Username, "wrong-password-2");

        var (result, after) = await LoginAsync(user.Username, Password);

        Assert.True(result.IsSuccess);
        Assert.Equal(0, after.FailedLoginAttempts);
    }

    [MySqlFact]
    public async Task ADeactivatedUserCannotSignInWithTheRightPassword()
    {
        var user = await TestHelpers.AddUserAsync(database, Password, isActive: false);

        var (result, _) = await LoginAsync(user.Username, Password);

        Assert.Equal(AuthErrors.InvalidCredentials, result.Error);
    }

    [MySqlFact]
    public async Task AWeakOldHashIsReplacedWithTheCurrentOneOnTheNextGoodSignIn()
    {
        var weak = new IdentityPasswordHasher(10_000);
        var user = await TestHelpers.AddUserAsync(database, Password, hasher: weak);
        Assert.Equal(10_000, IterationsIn(user.PasswordHash));

        var (result, after) = await LoginAsync(user.Username, Password);

        Assert.True(result.IsSuccess);
        Assert.Equal(220_000, IterationsIn(after.PasswordHash));
        Assert.Equal(PasswordCheck.Success, new IdentityPasswordHasher().Verify(after.PasswordHash, Password));
    }

    private static int IterationsIn(string hash)
    {
        var bytes = Convert.FromBase64String(hash);
        return (bytes[5] << 24) | (bytes[6] << 16) | (bytes[7] << 8) | bytes[8];
    }
}
