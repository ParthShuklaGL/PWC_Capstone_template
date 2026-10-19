using Microsoft.EntityFrameworkCore;
using NimbusSales.Crm.Domain;

namespace NimbusSales.Crm.Data;

public class CrmDbContext : DbContext
{
    public CrmDbContext(DbContextOptions<CrmDbContext> options)
        : base(options)
    {
    }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Deal> Deals => Set<Deal>();
    public DbSet<DealStageChange> DealStageChanges => Set<DealStageChange>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var account = modelBuilder.Entity<Account>();
        account.HasKey(a => a.Id);
        account.Property(a => a.AccountRef).HasMaxLength(16).IsRequired();
        account.Property(a => a.Name).HasMaxLength(200).IsRequired();
        account.Property(a => a.Industry).HasMaxLength(80);
        account.Property(a => a.Country).HasMaxLength(80);
        account.Property(a => a.Website).HasMaxLength(200);
        account.Property(a => a.CreatedAt).IsRequired();
        account.HasIndex(a => a.AccountRef).IsUnique();

        var contact = modelBuilder.Entity<Contact>();
        contact.HasKey(c => c.Id);
        contact.Property(c => c.ContactRef).HasMaxLength(16).IsRequired();
        contact.Property(c => c.FirstName).HasMaxLength(80).IsRequired();
        contact.Property(c => c.LastName).HasMaxLength(80).IsRequired();

        // Email is deliberately not unique. Sales share generic addresses (info@, sales@)
        // across several people at the same account.
        contact.Property(c => c.Email).HasMaxLength(160).IsRequired();

        contact.Property(c => c.Phone).HasMaxLength(40);
        contact.Property(c => c.JobTitle).HasMaxLength(120);
        contact.Property(c => c.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

        // Internal only. Set by finance during onboarding, never shown to the customer
        // and never shared outside the company.
        contact.Property(c => c.CreditRiskNote).HasMaxLength(500);

        contact.Property(c => c.LastContactedAt);
        contact.Property(c => c.CreatedAt).IsRequired();
        contact.HasOne(c => c.Account).WithMany()
            .HasForeignKey(c => c.AccountId).OnDelete(DeleteBehavior.Restrict);
        contact.HasIndex(c => c.ContactRef).IsUnique();
        contact.HasIndex(c => c.LastName);
        contact.HasIndex(c => c.AccountId);
        contact.HasIndex(c => c.Status);

        var activity = modelBuilder.Entity<Activity>();
        activity.HasKey(a => a.Id);
        activity.Property(a => a.Type).HasConversion<string>().HasMaxLength(20).IsRequired();
        activity.Property(a => a.Subject).HasMaxLength(200).IsRequired();
        activity.Property(a => a.Notes).HasMaxLength(2000);
        activity.Property(a => a.OccurredAt).IsRequired();
        activity.Property(a => a.CreatedAt).IsRequired();
        activity.HasOne(a => a.Contact).WithMany()
            .HasForeignKey(a => a.ContactId).OnDelete(DeleteBehavior.Cascade);
        activity.HasIndex(a => a.ContactId);
        activity.HasIndex(a => a.OccurredAt);

        var deal = modelBuilder.Entity<Deal>();
        deal.HasKey(d => d.Id);
        deal.Property(d => d.DealRef).HasMaxLength(16).IsRequired();
        deal.Property(d => d.Title).HasMaxLength(200).IsRequired();

        // GBP. Everything is in one currency today; see the stakeholder brief.
        deal.Property(d => d.Value).HasColumnType("decimal(18,2)").IsRequired();
        // MySql.EntityFrameworkCore hands back DateTime for date columns, so convert explicitly.
        deal.Property(d => d.ExpectedCloseDate).IsRequired().HasColumnType("date")
            .HasConversion(v => v.ToDateTime(TimeOnly.MinValue), v => DateOnly.FromDateTime(v));
        deal.Property(d => d.Stage).HasConversion<string>().HasMaxLength(20).IsRequired();
        deal.Property(d => d.ClosedDate).HasColumnType("date")
            .HasConversion(v => v.HasValue ? v.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                           v => v.HasValue ? DateOnly.FromDateTime(v.Value) : (DateOnly?)null);
        deal.Property(d => d.LostReason).HasMaxLength(500);
        deal.Property(d => d.CreatedAt).IsRequired();
        deal.Property(d => d.UpdatedAt).IsRequired();
        deal.HasOne(d => d.Account).WithMany()
            .HasForeignKey(d => d.AccountId).OnDelete(DeleteBehavior.Restrict);
        deal.HasOne(d => d.Contact).WithMany()
            .HasForeignKey(d => d.ContactId).OnDelete(DeleteBehavior.Restrict);
        deal.HasIndex(d => d.DealRef).IsUnique();
        deal.HasIndex(d => d.AccountId);
        deal.HasIndex(d => d.ContactId);
        deal.HasIndex(d => d.Stage);

        var stageChange = modelBuilder.Entity<DealStageChange>();
        stageChange.HasKey(c => c.Id);
        stageChange.Property(c => c.FromStage).HasConversion<string>().HasMaxLength(20);
        stageChange.Property(c => c.ToStage).HasConversion<string>().HasMaxLength(20).IsRequired();
        stageChange.Property(c => c.ChangedAt).IsRequired();
        stageChange.HasOne(c => c.Deal).WithMany()
            .HasForeignKey(c => c.DealId).OnDelete(DeleteBehavior.Cascade);
        stageChange.HasIndex(c => c.DealId);
    }
}
