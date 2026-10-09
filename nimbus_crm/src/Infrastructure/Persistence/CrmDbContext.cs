using Microsoft.EntityFrameworkCore;
using NimbusCrm.Application.Abstractions;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Persistence;

public class CrmDbContext(DbContextOptions<CrmDbContext> options) : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Account> Accounts => Set<Account>();

    public DbSet<Contact> Contacts => Set<Contact>();

    public DbSet<Deal> Deals => Set<Deal>();

    public DbSet<Activity> Activities => Set<Activity>();

    public DbSet<RevokedToken> RevokedTokens => Set<RevokedToken>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder) =>
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CrmDbContext).Assembly);
}
