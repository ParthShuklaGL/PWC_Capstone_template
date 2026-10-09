using Microsoft.Extensions.DependencyInjection;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;
using NimbusCrm.Infrastructure.Security;

namespace NimbusCrm.IntegrationTests.Infrastructure;

/// <summary>A clock the test moves by hand, so a 15-minute lockout does not take 15 minutes.</summary>
public sealed class ManualClock(DateTimeOffset start) : TimeProvider
{
    private DateTimeOffset _now = start;

    public override DateTimeOffset GetUtcNow() => _now;

    public void Advance(TimeSpan by) => _now += by;
}

public static class TestHelpers
{
    /// <summary>Scopes that hand out a fresh context on this fixture's database, as the real app does.</summary>
    public static IServiceScopeFactory ScopeFactory(MySqlDatabaseFixture database) =>
        new ServiceCollection()
            .AddScoped<IApplicationDbContext>(_ => database.CreateContext())
            .BuildServiceProvider()
            .GetRequiredService<IServiceScopeFactory>();

    public static async Task<User> AddUserAsync(
        MySqlDatabaseFixture database,
        string password,
        UserRole role = UserRole.User,
        bool isActive = true,
        IPasswordHasher? hasher = null)
    {
        await using var context = database.CreateContext();
        var name = "u" + Guid.NewGuid().ToString("N")[..12];
        var user = new User
        {
            Username = name,
            Email = name + "@example.com",
            PasswordHash = (hasher ?? new IdentityPasswordHasher()).Hash(password),
            Role = role,
            IsActive = isActive,
        };
        context.Users.Add(user);
        await context.SaveChangesAsync(CancellationToken.None);
        return user;
    }
}
