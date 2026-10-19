namespace NimbusSales.Crm.Domain;

/// <summary>
/// Something that happened with a <see cref="Contact"/> - a call, an email, a meeting, a note.
/// </summary>
public class Activity
{
    private Activity() { }

    public Activity(long contactId, ActivityType type, string subject, string? notes,
                    DateTimeOffset occurredAt)
    {
        ContactId = contactId;
        Type = type;
        Subject = subject;
        Notes = notes;
        OccurredAt = occurredAt;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public long Id { get; private set; }

    public long ContactId { get; set; }

    public Contact? Contact { get; set; }

    public ActivityType Type { get; private set; }

    public string Subject { get; private set; } = string.Empty;

    public string? Notes { get; private set; }

    public DateTimeOffset OccurredAt { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
}
