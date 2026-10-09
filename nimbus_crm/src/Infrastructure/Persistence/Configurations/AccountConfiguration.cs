using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Persistence.Configurations;

public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("Accounts");
        builder.HasKey(account => account.Id);

        builder.Property(account => account.Name).HasMaxLength(200).IsRequired();
        builder.Property(account => account.Industry).HasMaxLength(80);
        builder.Property(account => account.Country).HasMaxLength(80);
        builder.Property(account => account.Website).HasMaxLength(200);
        builder.Property(account => account.CreatedAt).HasColumnType("datetime(6)");

        // The account list is searched and sorted by name.
        builder.HasIndex(account => account.Name);
    }
}
