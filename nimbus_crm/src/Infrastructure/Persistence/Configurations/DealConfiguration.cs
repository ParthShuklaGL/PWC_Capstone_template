using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Persistence.Configurations;

public class DealConfiguration : IEntityTypeConfiguration<Deal>
{
    public void Configure(EntityTypeBuilder<Deal> builder)
    {
        builder.ToTable("Deals");
        builder.HasKey(deal => deal.Id);

        builder.Property(deal => deal.Title).HasMaxLength(200).IsRequired();
        builder.Property(deal => deal.Value).HasPrecision(18, 2);
        builder.Property(deal => deal.ExpectedCloseDate).IsRequired();
        builder.Property(deal => deal.Stage).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(deal => deal.LostReason).HasMaxLength(500);
        builder.Property(deal => deal.CreatedAt).HasColumnType("datetime(6)");
        builder.Property(deal => deal.UpdatedAt).HasColumnType("datetime(6)");

        builder.HasOne(deal => deal.Contact)
            .WithMany(contact => contact.Deals)
            .HasForeignKey(deal => deal.ContactId)
            .OnDelete(DeleteBehavior.Restrict);

        // The deal list filters by stage and pages in close-date order. The pipeline summary
        // groups by stage, and the leading column covers that too.
        builder.HasIndex(deal => new { deal.Stage, deal.ExpectedCloseDate });
    }
}
