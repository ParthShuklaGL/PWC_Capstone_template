using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Domain.Entities;
using NimbusCrm.Domain.Enums;

namespace NimbusCrm.Infrastructure.Seeding;

public sealed class SeedUserOptions
{
    public string Username { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}

public sealed class SeedOptions
{
    public const string SectionName = "Seed";

    public SeedUserOptions Admin { get; set; } = new();

    public SeedUserOptions User { get; set; } = new();
}

/// <summary>
/// Gives a fresh development database something to sign in with and something to report on: one
/// ADMIN and one USER, then the sample accounts, contacts, deals and activities. Each part only
/// runs when its own table is empty, so restarting never duplicates anything. It is only registered
/// in Development (see <c>AddDevelopmentSeeding</c>).
/// </summary>
public sealed class DevelopmentSeeder(
    IServiceScopeFactory scopeFactory,
    IOptions<SeedOptions> options,
    ILogger<DevelopmentSeeder> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        if (!await db.Users.AnyAsync(cancellationToken))
        {
            db.Users.Add(Create(options.Value.Admin, UserRole.Admin, hasher));
            db.Users.Add(Create(options.Value.User, UserRole.User, hasher));
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Seeded development users {Admin} (ADMIN) and {User} (USER)",
                options.Value.Admin.Username, options.Value.User.Username);
        }

        if (!await db.Accounts.AnyAsync(cancellationToken))
        {
            // The sample activities are logged by the first two users, in id order.
            var owners = await db.Users.OrderBy(user => user.Id).Take(2).ToListAsync(cancellationToken);
            SampleData.Add(db, owners, DateTime.UtcNow);
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation(
                "Seeded sample data: {Accounts} accounts, {Contacts} contacts, {Deals} deals, {Activities} activities",
                SampleData.AccountCount, SampleData.ContactCount, SampleData.DealCount, SampleData.ActivityCount);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static User Create(SeedUserOptions seed, UserRole role, IPasswordHasher hasher)
    {
        if (string.IsNullOrWhiteSpace(seed.Username)
            || string.IsNullOrWhiteSpace(seed.Email)
            || string.IsNullOrWhiteSpace(seed.Password))
        {
            throw new InvalidOperationException(
                $"The Seed section must give a username, email and password for the {role} user.");
        }

        return new User
        {
            Username = seed.Username,
            Email = seed.Email,
            PasswordHash = hasher.Hash(seed.Password),
            Role = role,
        };
    }
}
