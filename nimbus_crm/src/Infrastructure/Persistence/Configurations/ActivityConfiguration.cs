using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NimbusCrm.Domain.Entities;

namespace NimbusCrm.Infrastructure.Persistence.Configurations;

public class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder.ToTable("Activities");
        builder.HasKey(activity => activity.Id);

        builder.Property(activity => activity.Type).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(activity => activity.Subject).HasMaxLength(200).IsRequired();
        builder.Property(activity => activity.Notes).HasMaxLength(2000);
        builder.Property(activity => activity.OccurredAt).HasColumnType("datetime(6)");
        builder.Property(activity => activity.CreatedAt).HasColumnType("datetime(6)");

        builder.HasOne(activity => activity.Contact)
            .WithMany(contact => contact.Activities)
            .HasForeignKey(activity => activity.ContactId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(activity => activity.User)
            .WithMany()
            .HasForeignKey(activity => activity.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // The activities-per-user report groups by user.
        builder.HasIndex(activity => activity.UserId);

        // A contact's history is read newest first.
        builder.HasIndex(activity => new { activity.ContactId, activity.OccurredAt });
    }
}
