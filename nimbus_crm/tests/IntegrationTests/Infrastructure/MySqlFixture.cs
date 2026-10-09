using Microsoft.EntityFrameworkCore;
using NimbusCrm.Infrastructure.Persistence;

namespace NimbusCrm.IntegrationTests.Infrastructure;

/// <summary>
/// Marks a test that needs a real MySQL server. It is skipped, not failed, when none is configured:
/// set NIMBUS_TEST_MYSQL to a connection string for a server where the account may CREATE and DROP
/// databases, without a Database= part, for example
/// "Server=127.0.0.1;Port=3306;User=root;Password=...". Never point it at a database you care about:
/// every test class creates its own throwaway database and drops it afterwards.
/// </summary>
public sealed class MySqlFactAttribute : FactAttribute
{
    public const string EnvironmentVariable = "NIMBUS_TEST_MYSQL";

    public MySqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(EnvironmentVariable)))
        {
            Skip = $"Set {EnvironmentVariable} to a MySQL server connection string that may create databases.";
        }
    }
}

/// <summary>A throwaway database built by the real migrations (never EnsureCreated), dropped at the end.</summary>
public class MySqlDatabaseFixture : IAsyncLifetime
{
    private readonly string? _server = Environment.GetEnvironmentVariable(MySqlFactAttribute.EnvironmentVariable);

    public string DatabaseName { get; } = "nt_" + Guid.NewGuid().ToString("N")[..12];

    /// <summary>Every SQL command the contexts from this fixture have run, in order.</summary>
    public List<string> Sql { get; } = [];

    public CrmDbContext CreateContext() => new(new DbContextOptionsBuilder<CrmDbContext>()
        .UseMySQL($"{_server};Database={DatabaseName}")
        .LogTo(command => Sql.Add(command), (id, level) => id == Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.CommandExecuted, Microsoft.EntityFrameworkCore.Diagnostics.DbContextLoggerOptions.None)
        .Options);

    public async Task InitializeAsync()
    {
        if (_server is null)
        {
            return;
        }

        await using (var admin = new CrmDbContext(new DbContextOptionsBuilder<CrmDbContext>().UseMySQL(_server).Options))
        {
#pragma warning disable EF1002 // The name is a GUID generated above, never user input.
            await admin.Database.ExecuteSqlRawAsync(
                $"CREATE DATABASE `{DatabaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci", CancellationToken.None);
#pragma warning restore EF1002
        }

        await using var context = CreateContext();
        await context.Database.MigrateAsync(CancellationToken.None);
        await SeedAsync(context);
        Sql.Clear();
    }

    public async Task DisposeAsync()
    {
        if (_server is null)
        {
            return;
        }

        await using var admin = new CrmDbContext(new DbContextOptionsBuilder<CrmDbContext>().UseMySQL(_server).Options);
#pragma warning disable EF1002 // The name is a GUID generated above, never user input.
        await admin.Database.ExecuteSqlRawAsync($"DROP DATABASE IF EXISTS `{DatabaseName}`", CancellationToken.None);
#pragma warning restore EF1002
    }

    protected virtual Task SeedAsync(CrmDbContext context) => Task.CompletedTask;
}
