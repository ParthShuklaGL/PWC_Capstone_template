using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Persistence.Configurations;

public class RevokedTokenConfiguration : IEntityTypeConfiguration<RevokedToken>
{
    public void Configure(EntityTypeBuilder<RevokedToken> builder)
    {
        builder.ToTable("RevokedTokens");
        builder.HasKey(token => token.TokenId);

        // A jti is a 32-character GUID without dashes.
        builder.Property(token => token.TokenId).HasMaxLength(64).IsRequired();
        builder.Property(token => token.ExpiresAt).HasColumnType("datetime(6)");

        // The cleanup job deletes by expiry.
        builder.HasIndex(token => token.ExpiresAt);
    }
}
