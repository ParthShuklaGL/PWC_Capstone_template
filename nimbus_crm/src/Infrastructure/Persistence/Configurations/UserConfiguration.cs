using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(user => user.Id);

        builder.Property(user => user.Username).HasMaxLength(50).IsRequired();
        builder.Property(user => user.Email).HasMaxLength(160).IsRequired();
        builder.Property(user => user.PasswordHash).HasMaxLength(255).IsRequired();
        builder.Property(user => user.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(user => user.LockoutEndsAt).HasColumnType("datetime(6)");
        builder.Property(user => user.CreatedAt).HasColumnType("datetime(6)");

        builder.HasIndex(user => user.Username).IsUnique();
        builder.HasIndex(user => user.Email).IsUnique();
    }
}
