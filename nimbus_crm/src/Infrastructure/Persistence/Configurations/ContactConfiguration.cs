using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Persistence.Configurations;

public class ContactConfiguration : IEntityTypeConfiguration<Contact>
{
    public void Configure(EntityTypeBuilder<Contact> builder)
    {
        builder.ToTable("Contacts");
        builder.HasKey(contact => contact.Id);

        builder.Property(contact => contact.FirstName).HasMaxLength(80).IsRequired();
        builder.Property(contact => contact.LastName).HasMaxLength(80).IsRequired();

        // Not unique on purpose: several people can share a generic address (info@, sales@).
        builder.Property(contact => contact.Email).HasMaxLength(160).IsRequired();

        builder.Property(contact => contact.Phone).HasMaxLength(40);
        builder.Property(contact => contact.JobTitle).HasMaxLength(120);
        builder.Property(contact => contact.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(contact => contact.LastContactedAt).HasColumnType("datetime(6)");
        builder.Property(contact => contact.CreatedAt).HasColumnType("datetime(6)");

        builder.HasOne(contact => contact.Account)
            .WithMany(account => account.Contacts)
            .HasForeignKey(contact => contact.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        // The list is paged in surname order, so one index serves both the sort and the page.
        builder.HasIndex(contact => new { contact.LastName, contact.FirstName });
        builder.HasIndex(contact => contact.Email);
        builder.HasIndex(contact => contact.Status);
    }
}
